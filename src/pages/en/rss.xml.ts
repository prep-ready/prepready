import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { articles, hrefOf } from '../../lib/articles';

export async function GET(context: APIContext) {
  const list = await articles('en');
  return rss({
    title: 'PrepReady',
    description: 'Guides and readiness index',
    site: context.site!,
    items: list.map((a) => ({ title: a.data.title, description: a.data.description, pubDate: a.data.pubDate, link: hrefOf(a) })),
    customData: '<language>en</language>',
  });
}
