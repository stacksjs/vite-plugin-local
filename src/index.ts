/* eslint-disable no-console */
import type { Plugin, ViteDevServer } from 'vite'
import type { VitePluginLocalOptions } from './types'
import { exec } from 'node:child_process'
import process from 'node:process'
import readline from 'node:readline'
import { promisify } from 'node:util'
import { cleanup, startProxies } from '@stacksjs/rpx'
import colors from 'picocolors'
import { buildConfig } from './utils'

const execAsync = promisify(exec)

async function getSudoPassword(): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    process.stdout.write('\nSudo access required for proxy setup.\nPassword: ')

    rl.stdoutMuted = true
    // @ts-expect-error custom property
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (stringToWrite.includes('Password'))
        process.stdout.write(stringToWrite)
      else
        process.stdout.write('*')
    }

    rl.question('', (password) => {
      process.stdout.write('\n')
      rl.close()
      resolve(password)
    })
  })
}

async function validateSudo(password: string): Promise<boolean> {
  try {
    await execAsync(`echo "${password}" | sudo -S echo "Testing sudo access"`, {
      stdio: 'pipe',
    })
    return true
  }
  catch (error) {
    return false
  }
}

export function VitePluginLocal(options: VitePluginLocalOptions): Plugin {
  const {
    enabled = true,
    verbose = false,
    etcHostsCleanup = true,
  } = options

  let domains: string[] | undefined
  let sudoPassword: string | undefined
  let proxyUrl: string | undefined
  let originalConsole: typeof console

  const debug = (...args: any[]) => {
    if (verbose)
      originalConsole.log('[vite-plugin-local]', ...args)
  }

  return {
    name: 'vite-plugin-local',
    enforce: 'pre',

    config(config) {
      if (!enabled)
        return config
      config.server = config.server || {}
      config.server.middlewareMode = false
      return config
    },

    async configureServer(server: ViteDevServer) {
      if (!enabled)
        return

      try {
        // Store original console methods
        originalConsole = { ...console }

        // Get sudo access before starting server
        debug('Getting sudo password...')
        sudoPassword = await getSudoPassword()

        debug('Validating sudo access...')
        const isValid = await validateSudo(sudoPassword)

        if (!isValid) {
          console.error('Invalid sudo password. Please restart the dev server and try again.')
          process.exit(1)
        }

        process.env.SUDO_PASSWORD = sudoPassword
        debug('Sudo access validated')

        const setupProxy = async () => {
          try {
            const host = typeof server.config.server.host === 'boolean'
              ? 'localhost'
              : server.config.server.host || 'localhost'

            const port = server.config.server.port || 5173
            const serverUrl = `${host}:${port}`

            const config = buildConfig(options, serverUrl)
            domains = [config.to]
            proxyUrl = config.to

            // Suppress all console output during proxy setup
            const noOp = () => { }
            console.log = noOp
            console.info = noOp
            console.warn = noOp

            debug('Starting proxies...')
            await startProxies(config)

            // Restore console
            console.log = originalConsole.log
            console.info = originalConsole.info
            console.warn = originalConsole.warn

            // Custom print URLs function
            const originalPrintUrls = server.printUrls
            server.printUrls = function () {
              const protocol = options.https ? 'https' : 'http'
              console.log(`\n  vitepress v1.5.0 & rpx v0.5.0\n`)
              console.log(`  ➜  Local:   ${colors.cyan(`http://localhost:${port}/`)}`)
              console.log(`  ➜  Proxied: ${colors.cyan(`${protocol}://${proxyUrl}/`)}`)
              if (options.https) {
                console.log(`  ➜  SSL:     ${colors.dim('TLS 1.2/1.3, HTTP/2, HSTS')}`)
              }
              console.log(`  ➜  Network: use --host to expose`)
              console.log(`  ➜  press h to show help\n`)
            }

            // Force a reprint of the URLs
            server.printUrls()
            debug('Proxy setup complete')
          }
          catch (error) {
            console.error('Failed to start reverse proxy:', error)
          }
        }

        server.httpServer?.once('listening', setupProxy)
        if (server.httpServer?.listening) {
          debug('Server already listening, setting up proxy immediately')
          await setupProxy()
        }
      }
      catch (error) {
        console.error('Failed to initialize plugin:', error)
      }

      server.httpServer?.once('close', async () => {
        if (domains?.length) {
          debug('Cleaning up...')
          if (sudoPassword)
            process.env.SUDO_PASSWORD = sudoPassword

          await cleanup({
            domains,
            etcHostsCleanup,
            verbose,
          })
          domains = undefined
          sudoPassword = undefined
          debug('Cleanup complete')
        }
      })
    },
  }
}

export default VitePluginLocal
