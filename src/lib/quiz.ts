import { getImage } from 'astro:assets';
import { getCollection, type CollectionEntry } from 'astro:content';
import { cardCode, cardHref, getCards, pages, titleKey, type DrawerKey } from './cards';
import { FIRST, LAST } from './roll';

/**
 * Вопросы викторины собираются при сборке из карточек, поэтому у каждого
 * вопроса есть карточка, где написан ответ. Раунд браузер набирает сам —
 * каждый раз из других вопросов и с другими неверными вариантами.
 */

export type QuizKind = 'stroka' | 'line' | 'year' | 'track' | 'person' | 'film' | 'author' | 'shot' | 'place';

export interface Question {
  kind: QuizKind;
  ask: string;
  /** Строки песни или рассказ о месте — крупно, как цитата. */
  quote?: string;
  /** Снимок с плёнки. Подпись и автор открываются после ответа: в них бывает год. */
  shot?: { src: string; alt: string; ratio: number; caption: string; credit: string; url?: string };
  answer: string;
  /** Неверные варианты: свой список или имя общего списка из Quiz.lists. Браузер берёт из них три. */
  wrong: string[] | string;
  /** Что ещё нельзя брать из общего списка: другие верные ответы. */
  not?: string[];
  /** Варианты — годы, их показывают по порядку. */
  ordered?: boolean;
  /** Карточка с ответом. */
  card: { code: string; title: string; href: string };
}

export interface Quiz {
  questions: Question[];
  lists: Record<string, string[]>;
}

const TALKOV = 'Игорь Тальков';

/** О месте гибели и о могиле вопросов не задаём. */
const QUIET_PLACES = new Set(['yubileynyy', 'vagankovo']);

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const unique = (list: string[]) => [...new Set(list)];

/** Соседние годы для неверных вариантов, в пределах [min, max]. */
function nearYears(year: number, min = 1950, max = 2010): string[] {
  const out: string[] = [];
  for (let y = year - 4; y <= year + 4; y++) if (y !== year && y >= min && y <= max) out.push(String(y));
  return out;
}

const ref = (key: DrawerKey, c: { id: string; data: { num: number; title: string } }) => ({
  code: cardCode(key, c.data.num),
  title: c.data.title,
  href: cardHref(key, c.id),
});

export async function getQuiz(): Promise<Quiz> {
  const [songs, albums, films, people, stroki, kadry, mesta] = await Promise.all([
    getCards('songs'),
    getCards('albums'),
    getCards('films'),
    getCards('people'),
    getCollection('stroki'),
    getCollection('kadry'),
    getCollection('mesta'),
  ]);
  const questions: Question[] = [];

  // Неверные варианты к строке — песни той же линии: среди лирики «КПСС» выдала бы ответ.
  const byLine = (line: CollectionEntry<'songs'>['data']['line']) =>
    songs.filter((s) => s.data.line === line).map((s) => s.data.title);
  const lists: Record<string, string[]> = {
    лирика: byLine('лирика'),
    гражданская: byLine('гражданская'),
    albums: albums.map((a) => a.data.title),
    words: unique([TALKOV, ...songs.map((s) => s.data.words)]),
    music: unique([TALKOV, ...songs.map((s) => s.data.music)]),
  };

  const lines = new Map(stroki.map((s) => [s.id, s.data.stroka?.trim()]));
  for (const s of songs) {
    const d = s.data;
    const card = ref('songs', s);
    const quote = lines.get(s.id);
    if (quote) questions.push({ kind: 'stroka', ask: 'Из какой песни эти строки?', quote, answer: d.title, wrong: d.line, card });

    const other = d.line === 'лирика' ? 'гражданская' : 'лирика';
    questions.push({ kind: 'line', ask: `К какой линии картотека относит песню «${d.title}»?`, answer: cap(d.line), wrong: [cap(other)], card });

    if (d.words !== TALKOV) questions.push({ kind: 'author', ask: `Кто написал слова песни «${d.title}»?`, answer: d.words, wrong: 'words', card });
    if (d.music !== TALKOV) questions.push({ kind: 'author', ask: `Кто написал музыку песни «${d.title}»?`, answer: d.music, wrong: 'music', card });

    // Пластинка с песней. Альбом с тем же названием, что у песни, ответ выдал бы сам.
    const keys = [d.title, ...d.aka].map(titleKey);
    const on = albums.filter((a) => a.data.tracks.some((t) => keys.includes(titleKey(t))));
    const album = on.find((a) => !keys.includes(titleKey(a.data.title)));
    if (album) {
      questions.push({
        kind: 'track',
        ask: `На каком из этих альбомов есть песня «${d.title}»?`,
        answer: album.data.title,
        wrong: 'albums',
        not: on.map((a) => a.data.title),
        card: ref('albums', album),
      });
    }
  }

  for (const a of albums) {
    const year = Number(a.data.year);
    if (!year) continue;
    questions.push({
      kind: 'year',
      ask: `В каком году вышел альбом «${a.data.title}»?`,
      answer: a.data.year,
      wrong: nearYears(year),
      ordered: true,
      card: ref('albums', a),
    });
  }

  // Роли с тем же первым словом не ставим рядом: «певица» не может быть неверным ответом для «певицы, солистки».
  const stem = (role: string) => role.toLowerCase().slice(0, 3);
  for (const p of people) {
    questions.push({
      kind: 'person',
      ask: `${p.data.title} — кто это?`,
      answer: cap(p.data.role),
      wrong: people.filter((o) => stem(o.data.role) !== stem(p.data.role)).map((o) => cap(o.data.role)),
      card: ref('people', p),
    });
  }

  for (const f of films) {
    questions.push({
      kind: 'film',
      ask: `Кем Тальков был в фильме «${f.data.title}» (${f.data.year})?`,
      answer: cap(f.data.role),
      wrong: films.filter((o) => o.id !== f.id).map((o) => cap(o.data.role)),
      card: ref('films', f),
    });
  }

  for (const k of kadry) {
    const d = k.data;
    // Только снимки с точным годом, без последнего дня и без тех, где год написан прямо в описании («Геленджик 88»).
    if (d.kind !== 'снимок' || d.approx || d.see === 'pages/death') continue;
    if (new RegExp(`${d.year}|\\b${String(d.year).slice(2)}\\b`).test(d.alt)) continue;
    const img = await getImage({ src: d.src, width: Math.min(d.src.width, 720), format: 'webp' });
    questions.push({
      kind: 'shot',
      ask: 'В каком году сделан этот снимок?',
      shot: { src: img.src, alt: d.alt, ratio: d.src.width / d.src.height, caption: d.caption, credit: d.credit, url: d.url },
      answer: String(d.year),
      wrong: nearYears(d.year, FIRST, LAST),
      ordered: true,
      card: { code: pages.roll.code, title: `Плёнка, ${d.year} год`, href: `${pages.roll.path}#god-${d.year}` },
    });
  }

  // Рассказ о месте не должен называть само место: «Музей открылся…» про музей.
  const places = mesta.filter((m) => !QUIET_PLACES.has(m.id)).sort((a, b) => a.data.num - b.data.num);
  lists.places = places.map((m) => m.data.title);
  for (const m of places) {
    const word = m.data.title.replace(/[«»]/g, '').toLowerCase().slice(0, 5);
    if (m.data.text.toLowerCase().includes(word)) continue;
    questions.push({
      kind: 'place',
      ask: 'Где это было?',
      quote: m.data.text,
      answer: m.data.title,
      wrong: 'places',
      card: { code: pages.map.code, title: `Карта: ${m.data.title}`, href: `${pages.map.path}#mesto-${m.id}` },
    });
  }

  return { questions, lists };
}
