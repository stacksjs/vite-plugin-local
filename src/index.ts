/* eslint-disable no-console */
import type { Plugin, ViteDevServer } from 'vite'
import type { VitePluginLocalOptions } from './types'
import { exec } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { cleanup, startProxies } from '@stacksjs/rpx'
import colors from 'picocolors'
import packageJson from '../package.json'
import { buildConfig } from './utils'

function getPackageVersions() {
  let viteVersion
  try {
    // Try to get Vite version from node_modules first
    const vitePackageJson = readFileSync(
      join(process.cwd(), 'node_modules', 'vite', 'package.json'),
      'utf-8',
    )
    viteVersion = JSON.parse(vitePackageJson).version
  }
  // eslint-disable-next-line unused-imports/no-unused-vars
  catch (error) {
    // Fallback to package.json dependencies
    viteVersion = packageJson.devDependencies?.vite?.replace('^', '')
    || '0.0.0'
  }

  return {
    'vite': viteVersion,
    'vite-plugin-local': packageJson.version,
  }
}

const execAsync = promisify(exec)

// Simple sudo validation
async function validateSudo(): Promise<boolean> {
  try {
    await execAsync('sudo -n true')
    return true
  }
  // eslint-disable-next-line unused-imports/no-unused-vars
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
        originalConsole = { ...console }

        debug('Checking sudo access...')
        const hasSudo = await validateSudo()

        if (!hasSudo) {
          console.log('\nSudo access required for proxy setup.')
          console.log('Please enter your password when prompted.\n')

          try {
            await execAsync('sudo true')
          }
          // eslint-disable-next-line unused-imports/no-unused-vars
          catch (error) {
            console.error('Failed to get sudo access. Please try again.')
            process.exit(1)
          }
        }

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
            server.printUrls = function () {
              const protocol = options.https ? 'https' : 'http'
              const port = server.config.server.port || 5173
              const localUrl = `http://localhost:${port}/`
              const proxiedUrl = `${protocol}://${proxyUrl}/`

              const colorUrl = (url: string) =>
                colors.cyan(url.replace(/:(\d+)\//, (_, port) => `:${colors.bold(port)}/`))

              const versions = getPackageVersions()

              console.log(
                `\n${colors.bold(colors.green('vite'))} ${colors.green(`v${versions.vite}`)} ${colors.italic(
                  colors.green('&'),
                )} ${colors.bold(colors.green('vite-plugin-local'))} ${colors.green(`v${versions['vite-plugin-local']}`)}\n`,
              )

              console.log(`  ${colors.green('➜')}  ${colors.bold('Local')}:   ${colorUrl(localUrl)}`)
              console.log(`  ${colors.green('➜')}  ${colors.bold('Proxied')}: ${colorUrl(proxiedUrl)}`)

              if (options.https) {
                console.log(`  ${colors.green('➜')}  ${colors.bold('SSL')}:     ${colors.dim('TLS 1.2/1.3, HTTP/2')}`)
              }

              console.log(
                colors.dim(`  ${colors.green('➜')}  ${colors.bold('Network')}: use `)
                + colors.bold('--host')
                + colors.dim(' to expose'),
              )

              console.log(`\n  ${colors.green('➜')}  press ${colors.bold('h')} to show help\n`)
            }

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

          await cleanup({
            domains,
            etcHostsCleanup,
            verbose,
          })

          domains = undefined

          debug('Cleanup complete')
        }
      })
    },
  }
}

export default VitePluginLocal
