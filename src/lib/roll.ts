import { getImage } from 'astro:assets';
import { getCollection, type CollectionEntry } from 'astro:content';
import { cardCode, cardHref, getCards, resolveRef, type DrawerKey } from './cards';

/** Тальков прожил 36 лет — ровно столько кадров на фотоплёнке. */
export const FIRST = 1956;
export const LAST = 1991;

type Kadr = CollectionEntry<'kadry'>['data'];

/** Снимок на плёнке, готовый для страницы и для окна проявки. */
export interface Shot extends Kadr {
  id: string;
  /** Номер в общем порядке снимков — по нему окно листает кадры. */
  index: number;
  /** Номер кадра на плёнке, 1–36. */
  frame: number;
  /** Большая версия для окна проявки. */
  full: string;
  card?: { code: string; title: string; href: string };
}

/** Запись в журнале плёнки: песня, пластинка, фильм или начало периода биографии. */
export interface Event {
  code: string;
  title: string;
  href: string;
  /** «не позднее» — год известен только как крайний. */
  note?: string;
}

export interface Frame {
  n: number;
  year: number;
  /** «6 лет», «34 года». */
  age: string;
  /** Период биографии, в который попадает год. */
  period?: { title: string; href: string };
  shots: Shot[];
  events: Event[];
}

function years(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return `${n} год`;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return `${n} года`;
  return `${n} лет`;
}

/** Сколько лет исполнилось в этом году. День рождения 4 ноября, а в 1991-м он не дожил до него. */
function age(year: number): string {
  if (year === FIRST) return 'родился';
  return years(year === LAST ? year - FIRST - 1 : year - FIRST);
}

/**
 * Год из строки карточки: «1989», «1990 (предположительно)» — точный год,
 * «не позднее 1987» — крайний год с пометкой. «Конец 1980-х» на плёнку не ставится.
 */
function yearOf(text?: string): { year: number; note?: string } | undefined {
  if (!text) return;
  const exact = text.match(/^(\d{4})(?!-)/);
  if (exact) return { year: Number(exact[1]) };
  const latest = text.match(/^не позднее (\d{4})$/);
  if (latest) return { year: Number(latest[1]), note: 'не позднее' };
}

/** «1956–1974» или «1991» → [начало, конец]. */
function span(text: string): [number, number] {
  const [a, b = a] = text.split(/[–-]/).map(Number);
  return [a, b];
}

export async function getRoll(): Promise<Frame[]> {
  const [kadry, bio, songs, albums, films] = await Promise.all([
    getCollection('kadry'),
    getCards('bio'),
    getCards('songs'),
    getCards('albums'),
    getCards('films'),
  ]);
  kadry.sort((a, b) => a.data.year - b.data.year || a.data.order - b.data.order || a.id.localeCompare(b.id));

  let index = 0;
  const shots = await Promise.all(
    kadry.map(async (k) => {
      const full = await getImage({ src: k.data.src, width: Math.min(k.data.src.width, 1400), format: 'webp' });
      return {
        ...k.data,
        id: k.id,
        index: index++,
        frame: k.data.year - FIRST + 1,
        full: full.src,
        card: k.data.see ? await resolveRef(k.data.see) : undefined,
      } satisfies Shot;
    }),
  );

  // Журнал: что из картотеки приходится на каждый год. Периоды — по году начала.
  const event = (key: DrawerKey, c: { id: string; data: { num: number; title: string } }, note?: string): Event => ({
    code: cardCode(key, c.data.num),
    title: c.data.title,
    href: cardHref(key, c.id),
    note,
  });
  const byYear = new Map<number, Event[]>();
  const put = (year: number | undefined, e: Event) => year && byYear.set(year, [...(byYear.get(year) ?? []), e]);
  for (const b of bio) put(span(b.data.years)[0], { ...event('bio', b), note: 'начало периода' });
  for (const a of albums) put(yearOf(a.data.year)?.year, event('albums', a));
  for (const f of films) put(yearOf(f.data.year)?.year, event('films', f));
  for (const s of songs) {
    const y = yearOf(s.data.year);
    put(y?.year, event('songs', s, y?.note));
  }

  return Array.from({ length: LAST - FIRST + 1 }, (_, i) => {
    const year = FIRST + i;
    const p = bio.find((b) => {
      const [from, to] = span(b.data.years);
      return year >= from && year <= to;
    });
    return {
      n: i + 1,
      year,
      age: age(year),
      period: p && { title: p.data.title, href: cardHref('bio', p.id) },
      shots: shots.filter((s) => s.year === year),
      events: byYear.get(year) ?? [],
    };
  });
}
