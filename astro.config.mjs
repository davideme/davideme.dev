import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://davideme.dev',
  integrations: [sitemap({
    filter: (page) => !page.includes('/drafts/'),
  })],
  build: {
    assets: '_astro'
  },
  output: 'static'
});