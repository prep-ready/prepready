import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Artykuły i poradniki.
 * Plik: src/content/articles/<lang>/<slug>.md
 * `translationKey` łączy wersję PL i EN tego samego tekstu (hreflang + przełącznik języka).
 */
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(170),
    lang: z.enum(['pl', 'en']),
    translationKey: z.string(),
    cluster: z.enum(['bag', 'water-food', 'shelter', 'blackout', 'evacuation', 'first-aid', 'law']),
    kind: z.enum(['pillar', 'guide', 'test']).default('guide'),
    pubDate: z.coerce.date(),
    reviewed: z.coerce.date(),
    author: z.string(),
    reviewer: z.string().optional(),
    readingMinutes: z.number().int().positive(),
    draft: z.boolean().default(false),
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).default([]),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

/**
 * Aktualności: codzienne teksty o tym, co dzieje się w Polsce (tematy z Google Trends i komunikatów służb).
 * Plik: src/content/news/pl/<rrrr-mm-dd>-<slug>.md → adres /pl/aktualnosci/<slug>/ (data z nazwy pliku jest odcinana).
 */
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string().max(110),
    description: z.string().max(170),
    lang: z.enum(['pl', 'en']),
    pubDate: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().default('Redakcja PrepReady'),
    readingMinutes: z.number().int().positive(),
    /** Fraza z Google Trends, od której zaczął się temat (do statystyk i linkowania). */
    trend: z.string().optional(),
    region: z.string().optional(),
    tags: z.array(z.string()).default([]),
    /** Poradniki PrepReady powiązane z tematem: slugi z src/content/articles/<lang>/. */
    related: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    sources: z.array(z.object({ name: z.string(), url: z.string().url() })).min(1),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { articles, news };
