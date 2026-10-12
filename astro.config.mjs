// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  // Сайт живёт на GitHub Pages в подпапке с именем репозитория.
  // Все внутренние ссылки строятся через url() из src/lib/cards.ts, чтобы получить этот префикс.
  site: 'https://rego2552.github.io',
  base: '/kartotekaTalkov',
});
