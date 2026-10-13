import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://phoenixio.co',
  output: 'static',
  trailingSlash: 'always',
  build: { inlineStylesheets: 'never' },
  integrations: [sitemap()],
});
