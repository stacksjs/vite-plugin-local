<p align="center"><img src=".github/art/cover.jpg" alt="Social Card of this repo"></p>

[![npm version][npm-version-src]][npm-version-href]
[![GitHub Actions][github-actions-src]][github-actions-href]
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
<!-- [![npm downloads][npm-downloads-src]][npm-downloads-href] -->
<!-- [![Codecov][codecov-src]][codecov-href] -->

# Local Development

> A smart reverse proxy for local development, with HTTPS support & other goodies.

## Features

- Pretty development URLs
- Smart HTTPS management
- Automatically cleans URLs
- Lightweight
- _Soon: Local Tunneling_

## Install

```bash
npm install -d vite-plugin-local
# bun install -d vite-plugin-local
```

## Get Started

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import Local from 'vite-plugin-local'

export default defineConfig({
  plugins: [
    Local({
      domain: 'my-app.local', // default: stacks.localhost
      https: true, // default: true, pass TlsConfig options for custom certificates
      etcHostsCleanup: true, // default: true, cleans up /etc/hosts on server shutdown
      cleanUrls: true, // default: false, cleans up URLs by not requiring the .html extension
      verbose: true, // default: false, enables detailed logging
    })
  ]
})
```

To learn more, head over to the [documentation](https://docs.stackjs.org/).

## Testing

```bash
bun test
```

## Changelog

Please see our [releases](https://github.com/stacksjs/vite-plugin-local/releases) page for more information on what has changed recently.

## Contributing

Please review the [Contributing Guide](https://github.com/stacksjs/contributing) for details.

## Community

For help, discussion about best practices, or any other conversation that would benefit from being searchable:

[Discussions on GitHub](https://github.com/stacksjs/stacks/discussions)

For casual chit-chat with others using this package:

[Join the Stacks Discord Server](https://discord.gg/stacksjs)

## Postcardware

Two things are true: Stacks OSS will always stay open-source, and we do love to receive postcards from wherever Stacks is used! 🌍 _We also publish them on our website._

Our address: Stacks.js, 12665 Village Ln #2306, Playa Vista, CA 90094, United States 🌎

## Sponsors

We would like to extend our thanks to the following sponsors for funding Stacks development. If you are interested in becoming a sponsor, please reach out to us.

- [JetBrains](https://www.jetbrains.com/)
- [The Solana Foundation](https://solana.com/)

## Credits

- [Chris Breuer](https://github.com/chrisbbreuer)
- [All Contributors](https://github.com/stacksjs/vite-plugin-local/contributors)

## License

The MIT License (MIT). Please see [LICENSE](https://github.com/stacksjs/stacks/tree/main/LICENSE.md) for more information.

Made with 💙

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/vite-plugin-local?style=flat-square
[npm-version-href]: https://npmjs.com/package/vite-plugin-local
[github-actions-src]: https://img.shields.io/github/actions/workflow/status/stacksjs/vite-plugin-local/ci.yml?style=flat-square&branch=main
[github-actions-href]: https://github.com/stacksjs/vite-plugin-local/actions?query=workflow%3Aci

<!-- [codecov-src]: https://img.shields.io/codecov/c/gh/stacksjs/vite-plugin-local/main?style=flat-square
[codecov-href]: https://codecov.io/gh/stacksjs/vite-plugin-local -->
