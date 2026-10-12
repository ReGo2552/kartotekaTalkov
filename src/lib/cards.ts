import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

/**
 * Адрес внутри сайта с учётом base из astro.config.mjs: url('/pesni/') → '/kartotekaTalkov/pesni/'.
 * Ссылки от корня пишутся только через неё, иначе на GitHub Pages они ведут мимо сайта.
 */
export function url(path: string): string {
  return import.meta.env.BASE_URL.replace(/\/$/, '') + path;
}

/** Буква, адрес и название каждого ящика картотеки. */
export const drawers = {
  bio: { letter: 'Б', path: url('/biografiya'), name: 'Биография' },
  songs: { letter: 'П', path: url('/pesni'), name: 'Песни' },
  albums: { letter: 'А', path: url('/albomy'), name: 'Альбомы' },
  films: { letter: 'К', path: url('/kino'), name: 'Кино' },
  people: { letter: 'Л', path: url('/lyudi'), name: 'Люди' },
} as const;

export type DrawerKey = keyof typeof drawers;

/**
 * Отдельные страницы-карточки без своего ящика.
 * Шифр задан вручную, чтобы совпадал с буквой на главной.
 */
export const pages = {
  death: { code: 'Д-001', path: url('/6-oktyabrya-1991/'), title: '6 октября 1991' },
  memory: { code: 'М-001', path: url('/pamyat/'), title: 'Память' },
  author: { code: 'С-001', path: url('/ot-sostavitelya/'), title: 'От составителя' },
  roll: { code: 'Ф-001', path: url('/plyonka/'), title: 'Плёнка' },
} as const;

/** Шифр карточки: П-007. */
export function cardCode(collection: DrawerKey, num: number): string {
  return `${drawers[collection].letter}-${String(num).padStart(3, '0')}`;
}

/** Периоды биографии живут на одной странице, поэтому у них адрес-якорь. */
export function cardHref(collection: DrawerKey, id: string): string {
  const { path } = drawers[collection];
  return collection === 'bio' ? `${path}/#${id}` : `${path}/${id}/`;
}

export async function getCards<C extends DrawerKey>(collection: C): Promise<CollectionEntry<C>[]> {
  const cards = await getCollection(collection);
  return cards.sort((a, b) => a.data.num - b.data.num);
}

export const getSongs = () => getCards('songs');

/** Разворачивает ссылку «songs/rossiya» в шифр, название и адрес. */
export async function resolveRef(ref: string) {
  const [collection, id] = ref.split('/') as [DrawerKey, string];
  const entry = await getEntry(collection, id);
  if (!entry) throw new Error(`Карточка «${ref}» не найдена`);
  return {
    code: cardCode(collection, entry.data.num),
    title: entry.data.title,
    href: cardHref(collection, id),
  };
}

/** Название без регистра, «ё» и знаков — чтобы трек «Стоп!.. Думаю себе…» нашёл свою карточку. */
export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .replaceAll('ё', 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();
}

/** Все названия песни: основное и другие, под которыми она выходила. */
const songKeys = (s: CollectionEntry<'songs'>) => [s.data.title, ...s.data.aka].map(titleKey);

/** Карточка песни по названию трека, если она есть в ящике. */
export async function findSong(title: string) {
  const key = titleKey(title);
  return (await getSongs()).find((s) => songKeys(s).includes(key));
}

/** Альбомы картотеки, где есть эта песня под любым из её названий, — ссылки «albums/id». */
export async function albumsWithSong(song: CollectionEntry<'songs'>): Promise<string[]> {
  const keys = songKeys(song);
  const albums = await getCards('albums');
  return albums.filter((a) => a.data.tracks.some((t) => keys.includes(titleKey(t)))).map((a) => `albums/${a.id}`);
}

/** Все адреса карточек — для кнопки «вытянуть наугад». */
export async function allCardHrefs(): Promise<string[]> {
  const keys = Object.keys(drawers) as DrawerKey[];
  const hrefs = await Promise.all(
    keys.map(async (key) => (await getCards(key)).map((c) => cardHref(key, c.id))),
  );
  return [...hrefs.flat(), ...Object.values(pages).map((p) => p.path)];
}
