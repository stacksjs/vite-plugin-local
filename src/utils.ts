// @ts-expect-error dtsx needs to fully support this
import type { SingleReverseProxyConfig } from '@stacksjs/rpx'
import type { VitePluginLocalOptions } from './types'
import os from 'node:os'
import path from 'node:path'
// @ts-expect-error dtsx needs to fully support this
import { httpsConfig } from '@stacksjs/rpx'

export function getDefaultSSLConfig(): { caCertPath: string, certPath: string, keyPath: string } {
  return {
    caCertPath: path.join(os.homedir(), '.stacks', 'ssl', `stacks.localhost.ca.crt`),
    certPath: path.join(os.homedir(), '.stacks', 'ssl', `stacks.localhost.crt`),
    keyPath: path.join(os.homedir(), '.stacks', 'ssl', `stacks.localhost.crt.key`),
  }
}

export function buildConfig(options: VitePluginLocalOptions, serverUrl?: string): SingleReverseProxyConfig {
  if (!serverUrl)
    serverUrl = 'localhost:5173'

  return {
    from: serverUrl,
    to: options.domain,
    https: options.https === true
      ? httpsConfig({
          ...options,
          to: options.domain,
        })
      : options.https || false,
    cleanup: options.cleanup ?? true,
    cleanUrls: options.cleanUrls ?? false,
    vitePluginUsage: true,
    verbose: options.verbose ?? false,
  }
}
