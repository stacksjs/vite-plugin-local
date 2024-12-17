/* eslint-disable no-console */
import type { Plugin, ViteDevServer } from 'vite'
import type { VitePluginLocalOptions } from './types'
import { exec, spawn } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'
// @ts-expect-error dtsx issues
import { checkExistingCertificates, checkHosts, cleanup, startProxies } from '@stacksjs/rpx'
import { bold, cyan, dim, green, yellow } from 'picocolors'
import { buildConfig } from './utils'

const toggleComboKeysMap = {
  option: process.platform === 'darwin' ? 'Option(⌥)' : 'Alt(⌥)',
  meta: 'Command(⌘)',
  shift: 'Shift(⇧)',
}
function normalizeComboKeyPrint(toggleComboKey: string) {
  return toggleComboKey.split('-').map(key => toggleComboKeysMap[key] || key[0].toUpperCase() + key.slice(1)).join(dim('+'))
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
          await execAsync('sudo -n touch /etc/hosts')
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

  // sudo check in plugin initialization
  let sudoPromise: Promise<void> | null = null

  if (enabled) {
    sudoPromise = (async () => {
      const config = buildConfig(options)
      const domain = config.to

      const needsSudo = await needsSudoAccess(options, domain)
      if (needsSudo) {
        hasSudoAccess = await checkInitialSudo()

        if (!hasSudoAccess) {
          // Temporarily disable console.log to prevent VitePress output
          const origLog = console.log
          console.log = () => { }

          process.stdout.write('\nSudo access required for proxy setup.\n')

          hasSudoAccess = await new Promise<boolean>((resolve) => {
            const sudo = spawn('sudo', ['true'], {
              stdio: 'inherit',
            })

            sudo.on('exit', (code) => {
              resolve(code === 0)
            })
          })

          // Restore console.log
          console.log = origLog

          if (!hasSudoAccess) {
            console.error('Failed to get sudo access. Please try again.')
            process.exit(1)
          }
        }
      }
    })()
  }

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

    async configureServer(viteServer: ViteDevServer) {
      if (!enabled)
        return

      // Wait for sudo access before continuing
      if (sudoPromise) {
        await sudoPromise
      }

      server = viteServer

      // Store original console for debug
      originalConsole = { ...console }

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

      const colorUrl = (url: string) =>
        cyan(url.replace(/:(\d+)\//, (_, port) => `:${bold(port)}/`))

      // Store the original printUrls function
      const originalPrintUrls = server.printUrls

      // Wrap the printUrls function to add our custom output while preserving other plugins' modifications
      server.printUrls = () => {
        if (!server?.resolvedUrls)
          return

        // Call the original printUrls function first
        if (typeof originalPrintUrls === 'function') {
          originalPrintUrls.call(server)
        }
        else {
          // If no other plugin has modified printUrls, print the default local URL
          console.log(`  ${green('➜')}  ${bold('Local')}:   ${colorUrl(server.resolvedUrls.local[0])}`)
          console.log(`  ${green('➜')}  ${bold('Network')}: ${dim('use --host to expose')}`)
        }

        // Add our custom proxy URL information
        if (proxyUrl) {
          const protocol = options.https ? 'https' : 'http'
          const proxiedUrl = `${protocol}://${proxyUrl}/`
          console.log(`  ${green('➜')}  ${bold('Proxied URL')}: ${colorUrl(proxiedUrl)}`)

          if (options.https) {
            console.log(`  ${green('➜')}  ${bold('SSL')}: ${dim('TLS 1.2/1.3, HTTP/2')}`)
          }
        }
      }

      const startProxy = async () => {
        try {
          const host = typeof server?.config.server.host === 'boolean'
            ? 'localhost'
            : server?.config.server.host || 'localhost'

          const port = server?.config.server.port || 5173
          const serverUrl = `${host}:${port}`

          const config = buildConfig(options, serverUrl)
          domains = [config.to]
          proxyUrl = config.to

          debug('Starting proxies...')
          await startProxies(config)
          debug('Proxy setup complete')
        }
        catch (error) {
          console.error('Failed to start reverse proxy:', error)
          process.exit(1)
        }
      }

      // Wait for the server to be ready before starting the proxy
      server.httpServer?.once('listening', startProxy)
      if (server.httpServer?.listening) {
        await startProxy()
      }
    },

    // Add a closeBundle hook to ensure cleanup happens
    async closeBundle() {
      debug('Bundle closing, initiating cleanup...')
      await handleSignal('CLOSE')
    },
  }
}

export default VitePluginLocal
