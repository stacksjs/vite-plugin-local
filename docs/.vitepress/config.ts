import { defineConfig } from 'vitepress'
import Local from '../../src/index'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'vite-plugin-local',
  description: 'A better developer environment.',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Examples', link: '/markdown-examples' },
    ],

    sidebar: [
      {
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: 'https://github.com/vuejs/vitepress' }],
  },
  vite: {
    plugins: [
      // @ts-expect-error seems to be a bug in Vitepress not being ready for Vite 6 (?)
      Local({
        domain: 'my-app.local', // default: stacks.localhost
        https: true, // Use default SSL config, pass TlsConfig options for custom
        verbose: false, // Enable detailed logging
        etcHostsCleanup: true, // Cleanup /etc/hosts on shutdown
      }),
    ],
  },
})
