import type { APIRoute, GetStaticPaths } from 'astro';
import { ogPages, renderOg, type Og } from '../../lib/og';

/** Превью для соцсетей: по картинке на каждую страницу картотеки. */
export const getStaticPaths: GetStaticPaths = async () =>
  (await ogPages()).map((og) => ({ params: { key: og.key }, props: { ...og } }));

export const GET: APIRoute = async ({ props }) =>
  new Response(new Uint8Array(await renderOg(props as Og)), { headers: { 'Content-Type': 'image/png' } });
