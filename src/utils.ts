import type { SingleReverseProxyConfig } from '@stacksjs/rpx'
import type { VitePluginLocalOptions } from './types'
import os from 'node:os'
import path from 'node:path'
import { httpsConfig } from '@stacksjs/rpx'

export function getDefaultSSLConfig(): { caCertPath: string, certPath: string, keyPath: string } {
  return {
    caCertPath: path.join(os.homedir(), '.stacks', 'ssl', `stacks.localhost.ca.crt`),
    certPath: path.join(os.homedir(), '.stacks', 'ssl', `stacks.localhost.crt`),
    keyPath: path.join(os.homedir(), '.stacks', 'ssl', `stacks.localhost.crt.key`),
  }
}

export function buildConfig(options: VitePluginLocalOptions, serverUrl: string): SingleReverseProxyConfig {
  return {
    from: serverUrl,
    to: options.domain,
    https: options.https === true ? httpsConfig(options) : options.https || false,
    etcHostsCleanup: options.etcHostsCleanup ?? true,
    verbose: false,
    // verbose: options.verbose ?? false,
  }
}
