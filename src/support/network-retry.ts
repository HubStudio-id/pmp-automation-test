// Connection resets between GitHub Actions and staging, absorbed before they reach the page.
// Why: on CI the staging server sometimes resets the connection, and every request riding on it fails at once:
//   run 42831714771  «FAILED GET admin-pmp…/assets/index-CygWpBU8.js (net::ERR_CONNECTION_RESET)»: the SPA never
//                    mounts and the scenario tests a blank page;
//   run 42833208786  eleven API GETs of one page (vendor-registrations, auth/me, …) reset in the same millisecond:
//                    the page keeps its loading state.
// The portals do not retry, so each run failed one different scenario. Here:
//   - static assets (/assets/<name>-<hash>.*) are fetched with retries and kept in memory per worker; the name carries
//     a content hash, so the cached copy is always the file the page asked for;
//   - API GETs are fetched with retries and never cached. Other methods go to the network untouched, so a write is
//     never sent twice. HTTP statuses are passed through as they are: only a reset or timed-out connection is retried.
import type { BrowserContext, Route } from 'playwright';

const ASSET = /^https:\/\/[^/]+\/assets\/[^?#]+\.(?:js|css|woff2?|ttf|svg|png|jpe?g|webp|ico)(?:\?.*)?$/;
const API = /^https:\/\/[^/]+\/api\//;
const ATTEMPTS = 3;
const cache = new Map<string, { status: number; headers: Record<string, string>; body: Buffer }>();

const closed = (error: unknown) => /has been closed/.test((error as Error)?.message ?? '');

async function fetchWithRetries(route: Route, timeout: number, keep: boolean) {
  const url = route.request().url();
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await route.fetch({ maxRetries: 2, timeout });
      const entry = { status: response.status(), headers: response.headers(), body: await response.body() };
      if (keep && entry.status === 200) cache.set(url, entry);
      // fulfill/abort reject when the scenario closed its context meanwhile; nothing is waiting for the answer then.
      return await route.fulfill(entry).catch(() => undefined);
    } catch (error) {
      if (closed(error)) return;
      lastError = error;
    }
  }
  console.warn(`[network] ${route.request().method()} ${new URL(url).pathname} failed ${ATTEMPTS} times: ${(lastError as Error)?.message?.split('\n')[0]}`);
  return route.abort('connectionreset').catch(() => undefined);
}

export async function retryResetConnections(context: BrowserContext) {
  await context.route(ASSET, async (route) => {
    const cached = cache.get(route.request().url());
    if (cached) return route.fulfill(cached).catch(() => undefined);
    return fetchWithRetries(route, 20_000, true);
  });
  await context.route(API, async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    return fetchWithRetries(route, 60_000, false);
  });
}
