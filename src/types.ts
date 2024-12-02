import type { CustomTlsConfig } from '@stacksjs/rpx'

export interface VitePluginLocalOptions {
  /**
   * Enable/disable the plugin
   * @default true
   */
  enabled?: boolean

  /**
   * The target domain to proxy to (e.g., 'my-app.localhost')
   * @example 'my-app.localhost'
   */
  to: string

  /**
   * SSL/TLS configuration
   * - true: uses default SSL config
   * - false: disables SSL
   * - object: custom SSL configuration
   * @default false
   */
  https?: boolean | CustomTlsConfig

  /**
   * Whether to cleanup /etc/hosts entries on shutdown
   * @default true
   */
  etcHostsCleanup?: boolean

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean
}

export type { CustomTlsConfig }
