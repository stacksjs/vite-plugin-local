/* eslint-disable no-console */
import type { Plugin, ViteDevServer } from 'vite'
import type { VitePluginLocalOptions } from './types'
import { cleanup, startProxies } from '@stacksjs/rpx'
import { buildConfig } from './utils'

export function VitePluginLocal(options: VitePluginLocalOptions): Plugin {
  const {
    enabled = true,
    verbose = false,
    etcHostsCleanup = true,
  } = options

  let domains: string[] | undefined

  return {
    name: 'vite-plugin-local',
    apply: 'serve' as const,

    configureServer(server: ViteDevServer) {
      // Wait for the server to be ready before starting the proxy
      server.httpServer?.once('listening', async () => {
        if (!enabled)
          return

        try {
          const host = typeof server.config.server.host === 'boolean'
            ? 'localhost'
            : server.config.server.host || 'localhost'

          const port = server.config.server.port || 5173
          const serverUrl = `${host}:${port}`

          const config = buildConfig(options, serverUrl)
          domains = [config.to]

          await startProxies(config)

          if (verbose) {
            console.log('\nProxy Configuration:')
            console.log('-------------------')
            console.log('From:', serverUrl)
            console.log('To:', config.to)
            console.log('HTTPS:', !!config.https)
            console.log('Cleanup enabled:', config.etcHostsCleanup)
          }

          console.log(`🔄 Reverse proxy active: ${serverUrl} → ${config.to}`)
          if (config.https)
            console.log('🔒 HTTPS enabled with automatic certificate management')
        }
        catch (error) {
          console.error('Failed to start reverse proxy:', error)
        }
      })

      // Add close handler
      server.httpServer?.once('close', async () => {
        if (domains?.length) {
          await cleanup({
            domains,
            etcHostsCleanup,
            verbose,
          })
          domains = undefined
        }
      })
    },
  }
}

export type { VitePluginLocalOptions }
export default VitePluginLocal
