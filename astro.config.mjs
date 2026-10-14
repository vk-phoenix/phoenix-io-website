import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://phoenixio.co',
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  // Keep fonts as files: the CSP (public/_headers) blocks data: fonts.
  vite: { build: { assetsInlineLimit: 0 } },
  integrations: [sitemap()],
});
