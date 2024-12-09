import { defineConfig } from 'vitepress'
import Local from '../../src/index'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'vite-plugin-local',
  description: 'A better developer environment.',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Docs', link: '/get-started' },
      { text: 'Changelog', link: 'https://github.com/stacksjs/vite-plugin-local/releases' },
    ],

    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Get Started', link: '/get-started' },
        ],
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/stacksjs/vite-plugin-local' },
      { icon: 'bluesky', link: 'https://bsky.app/profile/chrisbreuer.dev' },
      { icon: 'twitter', link: 'https://twitter.com/stacksjs' },
    ],
  },

  vite: {
    plugins: [
      // @ts-expect-error seems to be a bug in Vitepress not being ready for Vite 6 (?)
      Local({
        domain: 'docs.localhost', // default: stacks.localhost
        https: true, // Use default SSL config, pass TlsConfig options to customize
        etcHostsCleanup: true, // Cleanup /etc/hosts on shutdown
        verbose: false, // Enable detailed logging
      }),
    ],
  },
})
