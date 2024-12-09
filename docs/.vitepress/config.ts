import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'vite-plugin-local',
  description: 'A better developer environment.',
  cleanUrls: true,

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Docs', link: '/introduction' },
      { text: 'Changelog', link: 'https://github.com/stacksjs/vite-plugin-local/releases' },
    ],

    sidebar: [
      {
        text: 'Get Started',
        items: [
          { text: 'Introduction', link: '/introduction' },
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
})
