import type { TlsConfig } from '@stacksjs/rpx'

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
  domain: string

  /**
   * SSL/TLS configuration
   * - true: uses default SSL config
   * - false: disables SSL
   * - object: custom SSL configuration
   * @default false
   */
  https?: boolean | TlsConfig

  /**
   * Whether to cleanup /etc/hosts entries on shutdown
   * @default true
   */
  etcHostsCleanup?: boolean

  /**
   * By default, VitePress resolves inbound links to URLs ending with .html.
   * However, some users may prefer "Clean URLs" without the .html extension
   * for example, example.com/path instead of example.com/path.html.
   * @default false
   */
  cleanUrls?: boolean

  /**
   * Enable verbose logging
   * @default false
   */
  verbose?: boolean
}

export type { TlsConfig }
