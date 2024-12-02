import type { ReverseProxyOptions } from '@stacksjs/rpx'
import type { VitePluginLocalOptions } from './types'
import os from 'node:os'
import path from 'node:path'

export function getDefaultSSLConfig(): { caCertPath: string, certPath: string, keyPath: string } {
  return {
    caCertPath: path.join(os.homedir(), '.stacks', 'ssl', `stacks.localhost.ca.crt`),
    certPath: path.join(os.homedir(), '.stacks', 'ssl', `stacks.localhost.crt`),
    keyPath: path.join(os.homedir(), '.stacks', 'ssl', `stacks.localhost.crt.key`),
  }
}

export function buildConfig(options: VitePluginLocalOptions, serverUrl: string): ReverseProxyOptions {
  const target = typeof options.target === 'string' ? { to: options.target } : options.target

  return {
    https: options.https === true ? getDefaultSSLConfig() : options.https,
    etcHostsCleanup: options.etcHostsCleanup ?? true,
    verbose: options.verbose ?? false,
    proxies: [
      {
        from: serverUrl,
        to: target.to,
      },
    ],
  }
}
