/** /tg-artykuly.json — lista poradników dla bota Telegram (scripts/tg-content.mjs). Generuje się przy każdym buildzie. */
import type { APIRoute } from 'astro';
import { articles, hrefOf } from '../lib/articles';

export const GET: APIRoute = async ({ site }) => {
  const out: Record<string, object[]> = {};
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
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
