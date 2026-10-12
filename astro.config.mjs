// @ts-check
import { defineConfig } from 'astro/config';

/** «Опись» пробелов картотеки: страница /opis/ есть только в npm run dev, на сайт она не попадает. */
const opis = {
  name: 'opis',
  hooks: {
    /** @param {{ command: string, injectRoute: (r: { pattern: string, entrypoint: string }) => void }} o */
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command === 'dev') injectRoute({ pattern: '/opis', entrypoint: './src/dev/opis.astro' });
    },
  },
};

export default defineConfig({
  // Сайт живёт на GitHub Pages в подпапке с именем репозитория.
  // Все внутренние ссылки строятся через url() из src/lib/cards.ts, чтобы получить этот префикс.
  site: 'https://rego2552.github.io',
  base: '/kartotekaTalkov',
  integrations: [opis],
});
