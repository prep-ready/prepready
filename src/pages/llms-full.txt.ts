/** /llms-full.txt — pełna treść polskich poradników (Markdown) dla modeli językowych. */
import type { APIRoute } from 'astro';
import { articles, hrefOf } from '../lib/articles';

export const GET: APIRoute = async ({ site }) => {
  const pl = await articles('pl');
  const parts = pl.map((a) => {
    const d = a.data;
    const faq = d.faq.length ? '\n\n### Najczęstsze pytania\n\n' + d.faq.map((f) => `**${f.q}**\n${f.a}`).join('\n\n') : '';
    const src = d.sources.length ? '\n\n### Źródła\n\n' + d.sources.map((s) => `- ${s.name}: ${s.url}`).join('\n') : '';
    return `# ${d.title}\n\nURL: ${new URL(hrefOf(a), site).href}\nOstatni przegląd: ${d.reviewed.toISOString().slice(0, 10)}\n\n> ${d.description}\n\n${(a.body ?? '').replace(/<[^>]+>/g, '').trim()}${faq}${src}`;
  });
  const body = `# PrepReady, poradniki na czas kryzysu (pełna treść, PL)\n\nŹródło: https://prepready.pro · opis serwisu: https://prepready.pro/llms.txt\n\n---\n\n${parts.join('\n\n---\n\n')}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
