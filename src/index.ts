/* eslint-disable no-console */
import type { Plugin, ViteDevServer } from 'vite'
import type { VitePluginLocalOptions } from './types'
import { exec } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
// @ts-expect-error dtsx issues
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
  catch {
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

async function checkInitialSudo(): Promise<boolean> {
  try {
    await execAsync('sudo -n true')
    return true
  }
  catch {
    return false
  }
}

async function getSudoAccess(): Promise<boolean> {
  try {
    await execAsync('sudo true')
    return true
  }
  catch {
    return false
  }
}

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
          await execAsync('touch /etc/hosts')
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
    return false // If we can't check, don't assume we need sudo
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
  let isCleaningUp = false
  let hasSudoAccess = false
  let cleanupPromise: Promise<void> | null = null
  let server: ViteDevServer | undefined

  const debug = (...args: any[]) => {
    if (verbose)
      originalConsole.log('[vite-plugin-local]', ...args)
  }

  const exitHandler = async () => {
    if (!domains?.length || isCleaningUp) {
      debug('Skipping cleanup - no domains or already cleaning')
      return
    }

    isCleaningUp = true
    debug('Starting cleanup process')

    try {
      // Store the cleanup promise
      cleanupPromise = cleanup({
        domains,
        hosts: typeof cleanupOpts === 'boolean' ? cleanupOpts : cleanupOpts?.hosts,
        certs: typeof cleanupOpts === 'boolean' ? cleanupOpts : cleanupOpts?.certs,
        verbose,
      })

      await cleanupPromise
      domains = undefined
      debug('Cleanup completed successfully')
    }
    catch (error) {
      console.error('Error during cleanup:', error)
      throw error // Re-throw to ensure process exits with error
    }
    finally {
      isCleaningUp = false
      cleanupPromise = null
    }
  }

  const handleSignal = async (signal: string) => {
    debug(`Received ${signal}, initiating cleanup...`)

    try {
      await exitHandler()
      debug(`Cleanup after ${signal} completed successfully`)
    }
    catch (error) {
      console.error(`Cleanup failed after ${signal}:`, error)
      process.exit(1)
    }

    if (server?.httpServer) {
      server.httpServer.close()
    }

    // Only exit if we're handling a signal
    if (signal !== 'CLOSE') {
      process.exit(0)
    }
  }

  return {
    name: 'vite-plugin-local',
    enforce: 'pre',

    configureServer(viteServer: ViteDevServer) {
      if (!enabled)
        return

      server = viteServer

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

      // Add cleanup handlers for the server
      server.httpServer?.on('close', () => {
        debug('Server closing, cleaning up...')
        handleSignal('CLOSE')
      })

      // Register signal handlers
      process.once('SIGINT', () => handleSignal('SIGINT'))
      process.once('SIGTERM', () => handleSignal('SIGTERM'))
      process.once('beforeExit', () => handleSignal('beforeExit'))
      process.once('exit', async () => {
        // If there's a pending cleanup, wait for it
        if (cleanupPromise) {
          try {
            await cleanupPromise
          }
          catch (error) {
            console.error('Cleanup failed during exit:', error)
            process.exit(1)
          }
        }
      })

      const setupPlugin = async () => {
        try {
          const config = buildConfig(options, 'localhost:5173')
          const domain = config.to

          // Check if we need sudo
          const needsSudo = await needsSudoAccess(options, domain)

          if (needsSudo) {
            debug('Sudo access required')
            hasSudoAccess = await checkInitialSudo()

            if (!hasSudoAccess) {
              console.log('\nSudo access required for proxy setup.')
              hasSudoAccess = await getSudoAccess()

              if (!hasSudoAccess) {
                console.error('Failed to get sudo access. Please try again.')
                process.exit(1)
              }
            }
          }

          const setupProxy = async () => {
            try {
              const host = typeof server!.config.server.host === 'boolean'
                ? 'localhost'
                : server!.config.server.host || 'localhost'

              const port = server!.config.server.port || 5173
              const serverUrl = `${host}:${port}`

              const config = buildConfig(options, serverUrl)
              domains = [config.to]
              proxyUrl = config.to

              debug('Starting proxies...')

              await startProxies(config)

              server!.printUrls = function () {
                const protocol = options.https ? 'https' : 'http'
                const port = server!.config.server.port || 5173
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

              server!.printUrls()
              debug('Proxy setup complete')
            }
            catch (error) {
              console.error('Failed to start reverse proxy:', error)
              process.exit(1)
            }
          }

          server?.httpServer?.once('listening', setupProxy)
          if (server?.httpServer?.listening) {
            debug('Server already listening, setting up proxy immediately')
            await setupProxy()
          }
        }
        catch (error) {
          console.error('Failed to initialize plugin:', error)
          process.exit(1)
        }
      }

      setupPlugin()
    },

    // Add a closeBundle hook to ensure cleanup happens
    async closeBundle() {
      debug('Bundle closing, initiating cleanup...')
      await handleSignal('CLOSE')
    },
  }
}

export default VitePluginLocal
