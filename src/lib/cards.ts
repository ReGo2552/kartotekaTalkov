import { getCollection, getEntry, type CollectionEntry } from 'astro:content';

/** Буква ящика и адрес раздела для каждой коллекции. */
export const drawers = {
  songs: { letter: 'П', path: '/pesni' },
} as const;

export type DrawerKey = keyof typeof drawers;

/** Шифр карточки: П-007. */
export function cardCode(collection: DrawerKey, num: number): string {
  return `${drawers[collection].letter}-${String(num).padStart(3, '0')}`;
}

export function cardHref(collection: DrawerKey, id: string): string {
  return `${drawers[collection].path}/${id}/`;
}

export async function getSongs(): Promise<CollectionEntry<'songs'>[]> {
  const songs = await getCollection('songs');
  return songs.sort((a, b) => a.data.num - b.data.num);
}

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

/** Все адреса карточек — для кнопки «вытянуть наугад». */
export async function allCardHrefs(): Promise<string[]> {
  const songs = await getSongs();
  return songs.map((s) => cardHref('songs', s.id));
}
