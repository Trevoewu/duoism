import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// A `slug` in frontmatter overrides the entry id, which is the note's URL
const notes = defineCollection({
  loader: glob({
    base: './src/content/notes',
    pattern: '**/*.{md,mdx}',
  }),
  schema: z.object({
    title: z.string(),
    title_zh: z.string().optional(),
    title_en: z.string().optional(),
    description: z.string().optional(),
    description_zh: z.string().optional(),
    description_en: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    published: z.boolean().default(false),
    lang: z.enum(['zh', 'en']).optional(),
    translationOf: z.string().optional(),
  }),
});

export const collections = { notes };
