import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { articles, hrefOf } from '../../lib/articles';
import { newsPosts, newsHref } from '../../lib/news';

export async function GET(context: APIContext) {
  const guides = (await articles('pl')).map((a) => ({ title: a.data.title, description: a.data.description, pubDate: a.data.pubDate, link: hrefOf(a) }));
  const news = (await newsPosts('pl')).map((p) => ({ title: p.data.title, description: p.data.description, pubDate: p.data.pubDate, link: newsHref(p), categories: ['Aktualności'] }));
  return rss({
    title: 'PrepReady',
    description: 'Aktualności, poradniki i indeks gotowości',
    site: context.site!,
    items: [...news, ...guides].sort((a, b) => +b.pubDate - +a.pubDate),
    customData: '<language>pl</language>',
  });
}
