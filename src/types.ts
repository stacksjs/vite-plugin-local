import type { ReverseProxyOptions } from '@stacksjs/rpx'

export interface ProxyTarget {
  /**
   * The target domain to proxy to (e.g., 'my-app.localhost')
   */
  to: string
}

export interface VitePluginLocalOptions extends Omit<Partial<ReverseProxyOptions>, 'proxies'> {
  /**
   * Enable/disable the plugin
   * @default true
   */
  enabled?: boolean

  /**
   * Target domain configuration
   */
  target: ProxyTarget | string
}
