import { getImage } from 'astro:assets';
import { getCollection, type CollectionEntry } from 'astro:content';
import { cardHref, getCards, resolveRef } from './cards';

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

export interface Frame {
  n: number;
  year: number;
  /** «6 лет», «34 года». */
  age: string;
  /** Период биографии, в который попадает год. */
  period?: { title: string; href: string };
  shots: Shot[];
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

/** «1956–1974» или «1991» → [начало, конец]. */
function span(text: string): [number, number] {
  const [a, b = a] = text.split(/[–-]/).map(Number);
  return [a, b];
}

export async function getRoll(): Promise<Frame[]> {
  const [kadry, bio] = await Promise.all([getCollection('kadry'), getCards('bio')]);
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
    };
  });
}
