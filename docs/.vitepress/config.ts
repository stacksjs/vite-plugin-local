import VueDevTools from 'vite-plugin-vue-devtools'
import { defineConfig } from 'vitepress'
import Local from '../../src/index'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'vite-plugin-local',
  description: 'A better developer environment.',
  cleanUrls: true,

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Docs', link: '/intro' },
      { text: 'Changelog', link: 'https://github.com/stacksjs/vite-plugin-local/releases' },
    ],

    sidebar: [
      {
        text: 'Get Started',
        items: [
          { text: 'Introduction', link: '/intro' },
          { text: 'Install', link: '/install' },
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
        domain: 'stacks.localhost', // default: stacks.localhost
        https: true, // Use default SSL config, pass TlsConfig options to customize
        cleanup: {
          hosts: true, // Clean up relating /etc/hosts entry
          certs: false, // Clean up relating SSL certificates
        },
        verbose: false, // Enable detailed logging
      }),

      VueDevTools(),
    ],
  },
})
