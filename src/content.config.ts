import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** Источник сведений: название и (если есть) ссылка. */
const source = z.object({
  title: z.string(),
  url: z.string().optional(),
});

/**
 * Статус проверки карточки — ставится штампом.
 * «заполняется» — карточка заведена, но текст ещё не написан.
 */
const status = z.enum(['проверено', 'требует сверки', 'заполняется']).default('заполняется');

const songs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/songs' }),
  schema: z.object({
    /** Порядковый номер в ящике → шифр «П-001». */
    num: z.number(),
    title: z.string(),
    /** «Две стороны одной медали». */
    line: z.enum(['лирика', 'гражданская']),
    /** Строкой, потому что дата бывает приблизительной: «1990», «не позднее 1989». */
    year: z.string(),
    music: z.string().default('Игорь Тальков'),
    words: z.string().default('Игорь Тальков'),
    album: z.string().optional(),
    /** Где песня прозвучала и стала известна. */
    known: z.string().optional(),
    /** Строка из песни. Вписывает составитель сайта вручную. */
    quote: z.string().optional(),
    status,
    /** Ссылки на другие карточки: «songs/rossiya». */
    see: z.array(z.string()).default([]),
    sources: z.array(source).default([]),
  }),
});

export const collections = { songs };
