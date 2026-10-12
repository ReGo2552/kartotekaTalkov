import { defineCollection, type ImageFunction } from 'astro:content';
import { file, glob } from 'astro/loaders';
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

/**
 * Фото карточки. Файл кладётся рядом с карточкой, путь пишется от неё:
 * «./rossiya.jpg». Без поля photo на карточке остаётся пустое место под фото.
 */
const photo = (image: ImageFunction) =>
  z
    .object({
      src: image(),
      /** Что видно на снимке — для тех, кто не видит картинку. */
      alt: z.string(),
      /** Подпись под фото. */
      caption: z.string().optional(),
      /** Автор, год и лицензия: «Лев Медведев, 1990 · CC BY-SA 4.0». */
      credit: z.string(),
      /** Страница, откуда взято фото. */
      url: z.string().optional(),
    })
    .optional();

/** Поля, общие для карточек всех ящиков. */
const card = (image: ImageFunction) => ({
  /** Порядковый номер в ящике → шифр «П-001». */
  num: z.number(),
  title: z.string(),
  status,
  /** Ссылки на другие карточки: «songs/rossiya», «albums/rossiya». */
  see: z.array(z.string()).default([]),
  sources: z.array(source).default([]),
  photo: photo(image),
});

const from = (dir: string) => glob({ pattern: '**/*.md', base: `./src/content/${dir}` });

/** Биография: периоды жизни, выводятся одной страницей. */
const bio = defineCollection({
  loader: from('bio'),
  schema: ({ image }) => z.object({
    ...card(image),
    /** «1956–1974» */
    years: z.string(),
  }),
});

const songs = defineCollection({
  loader: from('songs'),
  schema: ({ image }) => z.object({
    ...card(image),
    /** «Две стороны одной медали». */
    line: z.enum(['лирика', 'гражданская']),
    /** Другие названия на изданиях: по ним треки альбомов находят карточку. */
    aka: z.array(z.string()).default([]),
    /** Строкой, потому что дата бывает приблизительной: «1990», «не позднее 1989». Нет — значит, неизвестен. */
    year: z.string().optional(),
    music: z.string().default('Игорь Тальков'),
    words: z.string().default('Игорь Тальков'),
    /** Первое издание записи в исполнении Талькова. */
    album: z.string().optional(),
    /** Где песня прозвучала и стала известна. */
    known: z.string().optional(),
    /** Кто ещё пел песню при жизни Талькова. */
    covers: z.string().optional(),
  }),
});

/**
 * Строки из песен — одним файлом, чтобы вписывать их подряд.
 * Ключ — имя файла карточки песни: «rossiya» для songs/rossiya.md.
 */
const stroki = defineCollection({
  loader: file('./src/content/stroki.yaml'),
  schema: z.object({
    title: z.string(),
    stroka: z.string().nullish(),
  }),
});

const albums = defineCollection({
  loader: from('albums'),
  schema: ({ image }) => z.object({
    ...card(image),
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
  schema: ({ image }) => z.object({
    ...card(image),
    year: z.string(),
    kind: z.enum(['художественный', 'документальный']),
    director: z.string(),
    /** Роль Талькова или его участие в фильме. */
    role: z.string(),
  }),
});

const people = defineCollection({
  loader: from('people'),
  schema: ({ image }) => z.object({
    ...card(image),
    /** Кем человек приходится Талькову. */
    role: z.string(),
    /** Годы жизни: «1924–2007», «род. 1953». */
    life: z.string().optional(),
  }),
});

/**
 * Кадры «Плёнки»: один год жизни — один кадр, с 1956-го по 1991-й.
 * Файл кадра лежит в src/content/kadry, снимок — рядом с ним или в другой карточке.
 */
const kadry = defineCollection({
  loader: from('kadry'),
  schema: ({ image }) => z.object({
    /** Год, на чей кадр встаёт снимок: когда снято или когда вышла пластинка. */
    year: z.number().int().min(1956).max(1991),
    /** Точнее года, если известно: «январь 1991». */
    date: z.string().optional(),
    /** Что на кадре: снимок Талькова, обложка пластинки, постер фильма или место. */
    kind: z.enum(['снимок', 'обложка', 'постер', 'место']),
    src: image(),
    alt: z.string(),
    /** Подпись на обороте. */
    caption: z.string(),
    /** Автор, год и лицензия, как у фото карточек. */
    credit: z.string(),
    url: z.string().optional(),
    /** Карточка, к которой относится кадр: «albums/rossiya». */
    see: z.string().optional(),
    /** Обвести красным карандашом — лучший кадр плёнки. */
    best: z.boolean().default(false),
    /** Порядок снимков внутри одного года: первый виден на плёнке. */
    order: z.number().default(0),
  }),
});

export const collections = { bio, songs, albums, films, people, stroki, kadry };
