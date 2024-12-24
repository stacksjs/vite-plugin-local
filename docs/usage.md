# Usage

Using this plugin is as simple as defining it in your Vite configuration.

```ts
// vite.config.{ts,js}
import { defineConfig } from 'vite'
import Local from 'vite-plugin-local'

export default defineConfig({
  plugins: [
    Local({
      domain: 'my-app.local', // default: stacks.localhost
      https: true, // default: true, pass TlsConfig options for custom certificates
      cleanup: {
        certs: true, // default: false, cleans up the certificates created on server shutdown
        hosts: true, // default: true, cleans up /etc/hosts on server shutdown
      },
      cleanUrls: true, // default: false, cleans up URLs by not requiring the .html extension
      verbose: true, // default: false, enables detailed logging
    })
  ]
})
```

To read about all of the available config options, check out the [config](/config) part of our documentation.
