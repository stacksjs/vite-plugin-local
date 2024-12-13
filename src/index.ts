/* eslint-disable no-console */
import type { Plugin, ViteDevServer } from 'vite'
import type { VitePluginLocalOptions } from './types'
import { exec } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { checkExistingCertificates, checkHosts, cleanup, startProxies } from '@stacksjs/rpx'
import { bold, cyan, dim, green } from 'picocolors'
import packageJson from '../package.json'
import { buildConfig } from './utils'

function getPackageVersions() {
  let viteVersion
  const vitePluginLocalVersion = packageJson.version
  let vitePressVersion

  try {
    // Try to get VitePress version first
    const vitePressPath = join(process.cwd(), 'node_modules', 'vitepress', 'package.json')
    try {
      const vitePressPackage = JSON.parse(readFileSync(vitePressPath, 'utf-8'))
      vitePressVersion = vitePressPackage.version
    }
    catch { }

    // Get Vite version
    const vitePackageJson = readFileSync(
      join(process.cwd(), 'node_modules', 'vite', 'package.json'),
      'utf-8',
    )
    viteVersion = JSON.parse(vitePackageJson).version
  }
  // eslint-disable-next-line unused-imports/no-unused-vars
  catch (error) {
    // Fallback to package.json dependencies
    viteVersion = packageJson.devDependencies?.vite?.replace('^', '') || '0.0.0'
  }

  return {
    'vitepress': vitePressVersion,
    'vite': viteVersion,
    'vite-plugin-local': vitePluginLocalVersion,
  }
}

const execAsync = promisify(exec)

async function needsSudoAccess(options: VitePluginLocalOptions, domain: string): Promise<boolean> {
  try {
    // Check if we need to generate certificates
    if (options.https) {
      const config = buildConfig(options, 'localhost:5173') // temporary URL for config
      const existingCerts = await checkExistingCertificates(config)
      if (!existingCerts) {
        return true
      }
    }

    // Check if we need to modify hosts file
    if (!domain.includes('localhost') && !domain.includes('127.0.0.1')) {
      const hostsExist = await checkHosts([domain], options.verbose)
      // Only need sudo if hosts don't exist and we don't have write permission
      if (!hostsExist[0]) {
        try {
          // Try to write a test file to check permissions
          await execAsync('touch /etc/hosts', { stdio: 'ignore' })
          return false
        }
        catch {
          return true
        }
      }
    }

    return false
  }
  catch (error) {
    console.error('Error checking sudo requirements:', error)
    return false // Changed to false - if we can't check, don't assume we need sudo
  }
}

export function VitePluginLocal(options: VitePluginLocalOptions): Plugin {
  const {
    enabled = true,
    verbose = false,
    cleanup: cleanupOpts = {
      hosts: true,
      certs: false,
    },
  } = options
  let domains: string[] | undefined
  let proxyUrl: string | undefined
  let originalConsole: typeof console
  let cleanupPromise: Promise<void> | null = null
  let isCleaningUp = false

  const debug = (...args: any[]) => {
    if (verbose)
      originalConsole.log('[vite-plugin-local]', ...args)
  }

  // Add cleanup handler for process exit
  const exitHandler = async () => {
    if (domains?.length && !isCleaningUp) {
      isCleaningUp = true
      debug('Cleaning up...')
      cleanupPromise = cleanup({
        domains,
        hosts: typeof cleanupOpts === 'boolean' ? cleanupOpts : cleanupOpts?.hosts,
        certs: typeof cleanupOpts === 'boolean' ? cleanupOpts : cleanupOpts?.certs,
        verbose,
      })
      await cleanupPromise
      domains = undefined
      debug('Cleanup complete')
      isCleaningUp = false
    }
  }

  // Override the library's process.exit
  const originalExit = process.exit
  process.exit = ((code?: number) => {
    if (cleanupPromise || domains?.length) {
      exitHandler().finally(() => {
        process.exit = originalExit
        process.exit(code)
      })
      return undefined as never
    }
    return originalExit(code)
  }) as (code?: number) => never

  // Handle cleanup for different termination signals
  process.on('SIGINT', exitHandler)
  process.on('SIGTERM', exitHandler)
  process.on('beforeExit', exitHandler)

  return {
    name: 'vite-plugin-local',
    enforce: 'pre',

    configureServer(server: ViteDevServer) {
      if (!enabled)
        return

      // Override console.log immediately to prevent VitePress initial messages
      const originalLog = console.log
      console.log = (...args) => {
        if (typeof args[0] === 'string' && (
          args[0].includes('vitepress v')
          || args[0].includes('press h to show help')
        )) {
          return
        }
        originalLog.apply(console, args)
      }

      // Store original console for debug
      originalConsole = { ...console }

      server.printUrls = () => { }

      const setupPlugin = async () => {
        try {
          const config = buildConfig(options, 'localhost:5173')
          const domain = config.to

          // Check if we need sudo
          const needsSudo = await needsSudoAccess(options, domain)

          if (needsSudo) {
            debug('Sudo access required')
            // Only show sudo message if we actually need it
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

              debug('Starting proxies...')

              await startProxies(config)

              server.printUrls = function () {
                const protocol = options.https ? 'https' : 'http'
                const port = server.config.server.port || 5173
                const localUrl = `http://localhost:${port}/`
                const proxiedUrl = `${protocol}://${proxyUrl}/`
                const colorUrl = (url: string) =>
                  cyan(url.replace(/:(\d+)\//, (_, port) => `:${bold(port)}/`))

                const versions = getPackageVersions()
                if (versions.vitepress) {
                  console.log(
                    `\n  ${bold(green('vitepress'))} ${green(`v${versions.vitepress}`)} ${dim('via')} ${bold(green('vite-plugin-local'))} ${green(`v${versions['vite-plugin-local']}`)}\n`,
                  )
                }
                else {
                  console.log(
                    `\n  ${bold(green('vite'))} ${green(`v${versions.vite}`)} ${dim('via')} ${bold(green('vite-plugin-local'))} ${green(`v${versions['vite-plugin-local']}`)}\n`,
                  )
                }

                console.log(`  ${green('➜')}  ${bold('Local')}:   ${colorUrl(localUrl)}`)
                console.log(`  ${green('➜')}  ${bold('Proxied')}: ${colorUrl(proxiedUrl)}`)

                if (options.https) {
                  console.log(`  ${green('➜')}  ${bold('SSL')}:     ${dim('TLS 1.2/1.3, HTTP/2')}`)
                }

                console.log(
                  dim(`  ${green('➜')}  ${bold('Network')}: use `)
                  + bold('--host')
                  + dim(' to expose'),
                )

                console.log(`\n  ${green(dim('➜'))}  ${dim('press')} ${bold('h')} ${dim('to show help')}\n`)
              }

              server.printUrls()
              debug('Proxy setup complete')
            }
            catch (error) {
              console.error('Failed to start reverse proxy:', error)
              process.exit(1)
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
          process.exit(1)
        }
      }

      return setupPlugin()
    },
  }
}

export default VitePluginLocal
