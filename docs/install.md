# Install

```bash
npm install -d vite-plugin-local
# bun install -d vite-plugin-local
```

## Usage

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
