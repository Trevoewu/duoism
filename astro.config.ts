import type { AstroIntegration } from 'astro';
import { cp, mkdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';

import { SITE_URL } from './src/consts';
import { remarkDitherImages } from './src/lib/remark-dither-images';

function syncDitheredAssets(): AstroIntegration {
  return {
    name: 'sync-dithered-assets',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const src = join(process.cwd(), 'public', '_dithered');
        try {
          await access(src);
        } catch {
          return;
        }
        const dest = join(fileURLToPath(dir), '_dithered');
        await mkdir(dest, { recursive: true });
        await cp(src, dest, { recursive: true, force: true });
      },
    },
  };
}

export default defineConfig({
  site: SITE_URL,
  integrations: [sitemap(), mdx(), syncDitheredAssets()],
  markdown: {
    remarkPlugins: [remarkMath, remarkDitherImages],
    rehypePlugins: [rehypeMathjax],
    shikiConfig: { theme: 'css-variables' },
  },
});
