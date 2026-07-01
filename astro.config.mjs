import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import yaml from '@modyfi/vite-plugin-yaml';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { unified, rehypeHeadingIds } from '@astrojs/markdown-remark';

// https://astro.build/config
export default defineConfig({
  site: 'https://davideme.com',
  markdown: {
    processor: unified({
      rehypePlugins: [
        rehypeHeadingIds,
        [
          rehypeAutolinkHeadings,
          {
            behavior: 'append',
            properties: { className: ['heading-anchor'], ariaLabel: 'Link to this section' },
            content: { type: 'text', value: '#' },
          },
        ],
      ],
    }),
  },
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
  server: {
    // Honor the PORT env var (used by the preview harness' autoPort) so the
    // dev server can bind to an assigned free port; default to 4321 otherwise.
    port: process.env.PORT ? Number(process.env.PORT) : 4321
  },
  output: 'static'
});