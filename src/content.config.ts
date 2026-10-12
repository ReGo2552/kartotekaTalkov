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
 * «требует сверки» — часть сведений подтверждена только одним источником.
 * «заполняется» — карточка заведена, но текст ещё не написан.
 */
const status = z.enum(['проверено', 'требует сверки', 'заполняется']).default('заполняется');

/** Поля, общие для карточек всех ящиков. */
const card = {
  /** Порядковый номер в ящике → шифр «П-001». */
  num: z.number(),
  title: z.string(),
  status,
  /** Ссылки на другие карточки: «songs/rossiya», «albums/rossiya». */
  see: z.array(z.string()).default([]),
  sources: z.array(source).default([]),
};

const from = (dir: string) => glob({ pattern: '**/*.md', base: `./src/content/${dir}` });

/** Биография: периоды жизни, выводятся одной страницей. */
const bio = defineCollection({
  loader: from('bio'),
  schema: z.object({
    ...card,
    /** «1956–1974» */
    years: z.string(),
  }),
});

const songs = defineCollection({
  loader: from('songs'),
  schema: z.object({
    ...card,
    /** «Две стороны одной медали». */
    line: z.enum(['лирика', 'гражданская']),
    /** Строкой, потому что дата бывает приблизительной: «1990», «не позднее 1989». */
    year: z.string(),
    music: z.string().default('Игорь Тальков'),
    words: z.string().default('Игорь Тальков'),
    /** Первое издание записи в исполнении Талькова. */
    album: z.string().optional(),
    /** Где песня прозвучала и стала известна. */
    known: z.string().optional(),
    /** Строка из песни. Вписывает составитель сайта вручную. */
    quote: z.string().optional(),
  }),
});

const albums = defineCollection({
  loader: from('albums'),
  schema: z.object({
    ...card,
    year: z.string(),
    artist: z.string().default('Игорь Тальков'),
    format: z.string(),
    label: z.string(),
    /** Номер по каталогу издателя, как на наклейке. */
    catno: z.string().optional(),
    /** Вышел после 6 октября 1991 года. */
    posthumous: z.boolean(),
    /** Названия песен совпадают с карточками ящика «П» — так строятся ссылки. */
    tracks: z.array(z.string()).default([]),
  }),
});

const films = defineCollection({
  loader: from('films'),
  schema: z.object({
    ...card,
    year: z.string(),
    kind: z.enum(['художественный', 'документальный']),
    director: z.string(),
    /** Роль Талькова или его участие в фильме. */
    role: z.string(),
  }),
});

const people = defineCollection({
  loader: from('people'),
  schema: z.object({
    ...card,
    /** Кем человек приходится Талькову. */
    role: z.string(),
    /** Годы жизни: «1924–2007», «род. 1953». */
    life: z.string().optional(),
  }),
});

export const collections = { bio, songs, albums, films, people };
