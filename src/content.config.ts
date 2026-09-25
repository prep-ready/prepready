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
    cluster: z.enum(['bag', 'water-food', 'shelter', 'blackout', 'evacuation', 'first-aid']),
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

export const collections = { articles };
