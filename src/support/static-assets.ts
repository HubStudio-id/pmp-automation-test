// Static portal assets (/assets/<name>-<hash>.js|css|…) fetched with retries and kept in memory per worker.
// Why: on GitHub Actions the staging server sometimes resets the connection of the main bundle
// (run 42831714771: «FAILED GET admin-pmp…/assets/index-CygWpBU8.js (net::ERR_CONNECTION_RESET)»), the SPA never
// mounts and the scenario tests a blank page. The file names carry a content hash, so a cached copy is always the
// file the page asked for, and every new scenario context no longer downloads the same bundle again.
import type { BrowserContext, Route } from 'playwright';

const ASSET = /^https:\/\/[^/]+\/assets\/[^?#]+\.(?:js|css|woff2?|ttf|svg|png|jpe?g|webp|ico)(?:\?.*)?$/;
const ATTEMPTS = 3;
const cache = new Map<string, { status: number; headers: Record<string, string>; body: Buffer }>();

async function serve(route: Route) {
  const url = route.request().url();
  const cached = cache.get(url);
  // fulfill/abort reject when the scenario closed its context meanwhile; nothing is waiting for the asset then.
  if (cached) return route.fulfill(cached).catch(() => undefined);
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await route.fetch({ maxRetries: 2, timeout: 20_000 });
      const entry = { status: response.status(), headers: response.headers(), body: await response.body() };
      if (entry.status === 200) cache.set(url, entry);
      return route.fulfill(entry).catch(() => undefined);
    } catch (error) {
      lastError = error;
    }
  }
  console.warn(`[assets] ${new URL(url).pathname} failed ${ATTEMPTS} times: ${(lastError as Error)?.message?.split('\n')[0]}`);
  return route.abort('connectionreset').catch(() => undefined);
}

export async function retryStaticAssets(context: BrowserContext) {
  await context.route(ASSET, serve);
}
