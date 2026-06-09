import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import yaml from '@modyfi/vite-plugin-yaml';

// https://astro.build/config
export default defineConfig({
  site: 'https://davideme.dev',
  integrations: [
    sitemap({ filter: (page) => !page.includes('/drafts/') }),
    mdx(),
  ],
  vite: {
    plugins: [yaml()],
  },
  build: {
    assets: '_astro'
  },
  output: 'static'
});