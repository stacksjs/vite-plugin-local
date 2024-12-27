# Install

Installing `vite-plugin-local` is easy. Simply pull it in via your package manager of choice.

::: code-group

```bash [npm]
npm install --save-dev vite-plugin-local

# or, install via
# npm i -d vite-plugin-local
```

```bash [bun]
bun install --dev vite-plugin-local

# or, install via
# bun add --dev vite-plugin-local
# bun i -d vite-plugin-local
```

```bash [pnpm]
pnpm add --save-dev vite-plugin-local

# or, install via
# pnpm i -d vite-plugin-local
```

```bash [yarn]
yarn add --dev vite-plugin-local

# or, install via
# yarn i -d vite-plugin-local
```

:::

## Usage

This minimal usage example shows how to use `vite-plugin-local` in your Vite configuration, using the plugin’s default settings.

```javascript
// vite.config.{js,ts}
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import local from 'vite-plugin-local'

export default defineConfig({
  plugins: [
    vue(), // svelte(), react(), ...
    local()
  ]
})
```

To read about the more elaborate usage API, check out the the following page in our documentation.
