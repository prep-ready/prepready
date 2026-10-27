// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';


export default defineConfig({
  site: 'https://prepready.pro',
  trailingSlash: 'always',
  // CSS wklejony w HTML: bez osobnego, blokującego żądania (szybszy LCP przy wolnym łączu).
  build: { format: 'directory', inlineStylesheets: 'always' },
  i18n: {
    defaultLocale: 'pl',
    locales: ['pl', 'en'],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  redirects: { '/': '/pl/' },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'pl', locales: { pl: 'pl-PL', en: 'en-US' } },
      filter: (page) => !page.includes('/newsletter/'),
    }),
  ],
});
