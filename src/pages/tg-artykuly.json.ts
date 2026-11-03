/** /tg-artykuly.json — lista poradników dla bota Telegram (scripts/tg-content.mjs). Generuje się przy każdym buildzie. */
import type { APIRoute } from 'astro';
import { articles, hrefOf } from '../lib/articles';
import { newsPosts, newsHref, newsSlug } from '../lib/news';
import { deals } from '../data/deals';

export const GET: APIRoute = async ({ site }) => {
  const out: Record<string, any> = { news: {} };
  for (const lang of ['pl', 'en'] as const) {
    out[lang] = (await articles(lang)).map((a) => ({
      slug: a.id.split('/').pop(),
      url: new URL(hrefOf(a), site).href,
      title: a.data.title,
      description: a.data.description,
      cluster: a.data.cluster,
      kind: a.data.kind,
      translationKey: a.data.translationKey,
      pubDate: a.data.pubDate.toISOString().slice(0, 10),
      faq: a.data.faq,
    }));
    out.news[lang] = (await newsPosts(lang)).map((p) => ({
      slug: newsSlug(p),
      url: new URL(newsHref(p), site).href,
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate.toISOString().slice(0, 10),
    }));
  }
  out.deals = deals
    .filter((d) => d.tg && new Date(d.until + 'T23:59:59') >= new Date())
    .map((d) => ({ code: d.code, brand: d.brand, until: d.until, tg: d.tg }));
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
