import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { articles, hrefOf } from '../../lib/articles';

export async function GET(context: APIContext) {
  const list = await articles('pl');
  return rss({
    title: 'PrepReady',
    description: 'Poradniki i indeks gotowości',
    site: context.site!,
    items: list.map((a) => ({ title: a.data.title, description: a.data.description, pubDate: a.data.pubDate, link: hrefOf(a) })),
    customData: '<language>pl</language>',
  });
}
