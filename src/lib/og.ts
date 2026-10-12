import { readFile } from 'node:fs/promises';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import { cardCode, cardHref, drawers, getCards, pages, url, type DrawerKey } from './cards';

/**
 * Картинки-превью для соцсетей: страница выглядит в ленте как карточка картотеки —
 * шифр, название, строка из песни, штамп. Собираются при сборке в /og/<ключ>.png.
 */
export interface Og {
  key: string;
  code: string;
  /** «Ящик „Песни“» над названием. */
  eyebrow: string;
  title: string;
  quote?: string;
  /** Короткая строка под названием: год, роль, формат. */
  sub?: string;
  stamp?: string;
  /** Снимок справа — только на превью главной — и его автор с лицензией. */
  photo?: string;
  photoCredit?: string;
}

/** Ключ картинки по адресу страницы: /kartotekaTalkov/pesni/rossiya/ → pesni--rossiya. */
export function ogKey(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  return path.replace(/^\/|\/$/g, '').replaceAll('/', '--') || 'index';
}

export async function ogPages(): Promise<Og[]> {
  const stroki = new Map((await getCollection('stroki')).map((s) => [s.id, s.data.stroka?.trim()]));
  const list: Og[] = [
    {
      key: 'index',
      code: '1956–1991',
      eyebrow: 'Картотека',
      title: 'Игорь Тальков',
      sub: 'Поэт, композитор, певец',
      photo: 'src/photos/orig_talkov-1991.jpg',
      photoCredit: 'Фото: Лев Медведев, 1991 · CC BY-SA 4.0',
    },
    { key: ogKey(url('/poisk/')), code: '?', eyebrow: 'Картотека', title: 'Поиск' },
  ];

  for (const p of Object.values(pages)) {
    list.push({ key: ogKey(p.path), code: p.code, eyebrow: 'Картотека', title: p.title });
  }

  const subs: { [K in DrawerKey]?: (d: any) => string | undefined } = {
    songs: (d) => d.year,
    albums: (d) => [d.year, d.format].filter(Boolean).join(' · '),
    films: (d) => [d.year, d.role].filter(Boolean).join(' · '),
    people: (d) => d.role,
  };

  for (const key of Object.keys(drawers) as DrawerKey[]) {
    const drawer = drawers[key];
    const cards = await getCards(key);
    list.push({ key: ogKey(`${drawer.path}/`), code: drawer.letter, eyebrow: 'Ящик картотеки', title: drawer.name, sub: `${cards.length} карточек` });
    // Периоды биографии живут на одной странице — у них общее превью ящика.
    if (key === 'bio') continue;
    for (const c of cards) {
      list.push({
        key: ogKey(cardHref(key, c.id)),
        code: cardCode(key, c.data.num),
        eyebrow: `Ящик «${drawer.name}»`,
        title: c.data.title,
        quote: key === 'songs' ? stroki.get(c.id) || undefined : undefined,
        sub: subs[key]?.(c.data),
        stamp: c.data.status,
      });
    }
  }
  return list;
}

/**
 * Шрифты сайта из @fontsource: satori читает woff, но не woff2.
 * В подмножестве cyrillic только буквы — цифры, «ёлочки» и тире лежат в latin.
 * Satori ищет недостающий знак только в шрифтах с другим именем, поэтому latin — «… Latin».
 */
const fonts = Promise.all(
  (
    [
      ['alumni-sans', 'Alumni Sans', 600],
      ['alumni-sans', 'Alumni Sans', 800],
      ['golos-text', 'Golos Text', 400],
      ['golos-text', 'Golos Text', 600],
    ] as const
  ).flatMap(([pkg, name, weight]) =>
    ['cyrillic', 'latin'].map(async (subset) => ({
      name: subset === 'latin' ? `${name} Latin` : name,
      weight,
      style: 'normal' as const,
      data: await readFile(`node_modules/@fontsource/${pkg}/files/${pkg}-${subset}-${weight}-normal.woff`),
    })),
  ),
);

type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown } };
const h = (style: Record<string, unknown>, ...children: unknown[]): Node => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
});

const RED = '#e3261c';
const DISPLAY = "'Alumni Sans', 'Alumni Sans Latin'";
const BODY = "'Golos Text', 'Golos Text Latin'";

export async function renderOg(og: Og): Promise<Buffer> {
  const long = og.title.length;
  const titleSize = long <= 14 ? 120 : long <= 24 ? 92 : long <= 40 ? 70 : 54;

  // Снимок вклеивается в картинку как data-URL, заранее уменьшенный.
  const photo = og.photo
    ? `data:image/jpeg;base64,${(await sharp(og.photo).resize(420, 542, { position: 'top' }).jpeg({ quality: 82 }).toBuffer()).toString('base64')}`
    : undefined;

  const tree = h(
    { width: '100%', height: '100%', background: '#0a0a0a', padding: 44, fontFamily: BODY, color: '#ececec' },
    h(
      {
        flexDirection: 'column',
        flexGrow: 1,
        background: '#141414',
        borderTop: `10px solid ${RED}`,
        padding: '40px 52px 36px',
      },
      // Шифр, ящик и название сайта
      h(
        { justifyContent: 'space-between', alignItems: 'center', fontSize: 26 },
        h({ gap: 18, alignItems: 'center' }, h({ color: RED, fontWeight: 600 }, og.code), h({ color: '#8d8d8d' }, og.eyebrow)),
        h({ fontFamily: DISPLAY, fontWeight: 600, fontSize: 30, letterSpacing: 2, color: '#8d8d8d' }, 'КАРТОТЕКА ТАЛЬКОВА'),
      ),
      h(
        {
          marginTop: 22,
          fontFamily: DISPLAY,
          fontWeight: 800,
          fontSize: titleSize,
          lineHeight: 0.92,
          textTransform: 'uppercase',
        },
        og.title,
      ),
      og.sub ? h({ marginTop: 14, fontSize: 26, color: '#c9c9c9' }, og.sub) : '',
      og.quote
        ? h(
            {
              marginTop: 30,
              paddingLeft: 24,
              borderLeft: `5px solid ${RED}`,
              flexDirection: 'column',
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: 44,
              lineHeight: 1.05,
              textTransform: 'uppercase',
            },
            ...og.quote.split('\n').map((line) => h({}, line)),
          )
        : '',
      // Штамп статуса внизу справа, адрес сайта слева
      h(
        { marginTop: 'auto', justifyContent: 'space-between', alignItems: 'flex-end' },
        h(
          { flexDirection: 'column', gap: 4, fontSize: 22, color: '#8d8d8d' },
          h({}, 'rego2552.github.io/kartotekaTalkov'),
          og.photoCredit ? h({ fontSize: 17 }, og.photoCredit) : '',
        ),
        og.stamp
          ? h(
              {
                padding: '6px 16px',
                border: `3px solid ${og.stamp === 'проверено' ? '#8d8d8d' : RED}`,
                color: og.stamp === 'проверено' ? '#c9c9c9' : RED,
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: 30,
                letterSpacing: 2,
                textTransform: 'uppercase',
                transform: 'rotate(-4deg)',
              },
              og.stamp,
            )
          : '',
      ),
    ),
    photo ? { type: 'img', props: { src: photo, width: 420, height: 542, style: { marginLeft: 0, objectFit: 'cover' } } } : '',
  );

  const svg = await satori(tree as any, { width: 1200, height: 630, fonts: await fonts });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer();
}
