import type { ConfigNames, FlatConfigComposer, TypedFlatConfigItem } from '@stacksjs/eslint-config'
import stacks from '@stacksjs/eslint-config'

const config: FlatConfigComposer<TypedFlatConfigItem, ConfigNames> = stacks({
  stylistic: {
    indent: 2,
    quotes: 'single',
  },

  typescript: true,
  jsonc: true,
  yaml: true,
  ignores: [
    'fixtures/**',
  ],
})

export default config
