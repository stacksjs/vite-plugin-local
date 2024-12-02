import type { Plugin } from 'vite'
import type { ProxyTarget, VitePluginLocalOptions } from './types'
import { startProxies } from '@stacksjs/rpx'
import { buildConfig } from './utils'

export function VitePluginLocal(options: VitePluginLocalOptions): Plugin {
  const { enabled = true } = options
  let proxyServer: Awaited<ReturnType<typeof startProxies>> | undefined

  return {
    name: 'vite-plugin-local',

    async configureServer(server) {
      if (!enabled)
        return

      try {
        // Get the server URL from Vite's configuration
        const host = server.config.server.host || 'localhost'
        const port = server.config.server.port || 5173
        const serverUrl = `${host}:${port}`

        const config = buildConfig(options, serverUrl)
        proxyServer = await startProxies(config)

        console.log(`🔄 Reverse proxy active: ${serverUrl} → ${config.proxies[0].to}`)
        if (config.https)
          console.log('🔒 HTTPS enabled with automatic certificate management')
      }
      catch (error) {
        console.error('Failed to start reverse proxy:', error)
      }
    },

    // async closeBundle() {
    //   if (proxyServer) {
    //     await proxyServer.close()
    //     proxyServer = undefined
    //   }
    // },
  }
}

export type { ProxyTarget, VitePluginLocalOptions }
export default VitePluginLocal
