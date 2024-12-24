# Configuration

The plugin can be configured with the following options:

```ts
// vite.config.ts
import type { LocalConfig } from 'vite-plugin-local'
import { defineConfig } from 'vite'
import Local from 'vite-plugin-local'

const config: LocalConfig = {
  /**
   * Enable/disable the plugin
   * @default true
   */
  enabled: true,

  /**
   * The target domain to proxy to (e.g., 'my-app.localhost')
   * @example 'my-app.test'
   * @example 'example.com'
   * @default 'stacks.localhost'
   */
  domain: 'my-app.local', // default: stacks.localhost

  /**
   * SSL/TLS configuration
   * - true: uses default SSL config
   * - false: disables SSL
   * - object: custom SSL configuration
   * @default false
   * @example true
   */
  https: true, // default: true, pass TlsConfig options for custom certificates

  /**
   * Cleanup options
   * - true: cleanup everything
   * - false: cleanup nothing
   * - object: cleanup specific items
   * @default { hosts: true, certs: false }
   * @example { hosts: true, certs: true }
   */
  cleanup: {
    certs: true, // default: false, cleans up the certificates created on server shutdown
    hosts: true, // default: true, cleans up /etc/hosts on server shutdown
  },

  /**
   * By default, VitePress resolves inbound links to URLs ending with .html.
   * However, some users may prefer "Clean URLs" without the .html extension
   * for example, example.com/path instead of example.com/path.html.
   * @default false
   */
  cleanUrls: true, // default: false, cleans up URLs by not requiring the .html extension

  /**
   * Enable verbose logging
   * @default false
   */
  verbose: true, // default: false, enables detailed logging
}

export default defineConfig({
  plugins: [
    Local(config)
  ]
})
```
