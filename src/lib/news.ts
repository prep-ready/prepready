import { getCollection, type CollectionEntry } from 'astro:content';
import { routes, type Lang } from '../i18n/ui';

export type NewsPost = CollectionEntry<'news'>;

/** Slug = nazwa pliku bez daty z przodu (2026-10-29-straz-graniczna → straz-graniczna). */
export const newsSlug = (p: NewsPost) => p.id.split('/').pop()!.replace(/^\d{4}-\d{2}-\d{2}-/, '');
export const newsHref = (p: NewsPost) => `${routes.news[p.data.lang]}${newsSlug(p)}/`;

export async function newsPosts(lang: Lang) {
  const all = await getCollection('news', (p) => p.data.lang === lang && (import.meta.env.DEV || !p.data.draft));
  return all.sort((a, b) => +b.data.pubDate - +a.data.pubDate);
}
