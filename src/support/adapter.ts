// Builds the page-object fixtures ({ app, screen, browser }, see pages/base.page.ts) from the scenario's Playwright page.
import type { Page, Response } from 'playwright';
import type { Fixtures as PageFixtures } from '../pages/base.page';

let patched = false;

/**
 * Locator defaults the page objects rely on:
 *  - tap() is a click on a desktop page;
 *  - text, label, placeholder and role-name strings match the WHOLE text by default. Playwright's
 *    default is a case-insensitive substring, which made getByLabel('Email') also match «Kirim ulang email…».
 *    Pass { exact: false } (or a RegExp) where a step really means «contains».
 * Patched once on the Page and Locator prototypes.
 */
function patchPlaywright(page: Page) {
  if (patched) return;
  const exactByDefault = (target: any) => {
    for (const method of ['getByText', 'getByLabel', 'getByPlaceholder']) {
      const original = target[method];
      target[method] = function (text: unknown, options?: { exact?: boolean }) {
        const opts = typeof text === 'string' && options?.exact === undefined ? { ...options, exact: true } : options;
        return original.call(this, text, opts);
      };
    }
    const originalRole = target.getByRole;
    target.getByRole = function (role: string, options?: { name?: unknown; exact?: boolean }) {
      const opts = typeof options?.name === 'string' && options.exact === undefined ? { ...options, exact: true } : options;
      return originalRole.call(this, role, opts);
    };
  };
  const locatorPrototype = Object.getPrototypeOf(page.locator('body'));
  locatorPrototype.tap = function tap(options?: object) { return this.click(options); };
  exactByDefault(locatorPrototype);
  exactByDefault(Object.getPrototypeOf(page));
  patched = true;
}

/** ResponseInfo shape (pages/base.page.ts): status/url/headers are values, json()/text() read the body. */
function wrapResponse(response: Response) {
  return {
    url: response.url(),
    status: response.status(),
    headers: response.headers(),
    json: () => response.json(),
    text: () => response.text(),
  };
}

export type Fixtures = PageFixtures;

export function fixturesFor(page: Page): Fixtures {
  patchPlaywright(page);
  const app = {
    open: async (url: string) => {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
      } catch (error) {
        // On a slow staging response Playwright can hit its navigation timeout while the page is still usable.
        // Continue so page objects can wait for the actual UI state; always rethrow a closed-page/navigation error.
        const timedOut = error instanceof Error && /Timeout/i.test(error.message);
        if (!timedOut || page.isClosed()) throw error;
      }
      // The portals are SPAs: goto() can finish before the app shell and its first API-backed render exist.
      // Wait for visible document content instead of sleeping, so slow CI runners do not assert on a blank page.
      // On CI the SPA sometimes stays blank for good (runs 42794334107 VREG-02, 42830217906 DASH-01: a blank screenshot
      // after 30 s), and only a new load brings it up, so a page still blank after 15 s is loaded once more.
      // Some API-only steps open the portal only to use its authenticated browser context. They do not need a rendered
      // shell, so a page that stays blank must not fail the setup before the API request can run.
      const rendered = () => page.waitForFunction(() => Boolean(document.body?.innerText.trim()), undefined, { timeout: 15_000 }).then(() => true, () => false);
      if (await rendered() || page.isClosed()) return;
      console.warn(`[app.open] ${new URL(url).pathname} stayed blank for 15 s; loading it once more`);
      await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await rendered();
    },
    screenshot: async () => page.screenshot(),
  };
  const browser = {
    waitForResponse: (pattern: RegExp | string, options?: { timeout?: number }) => page.waitForResponse(pattern, options).then(wrapResponse),
    waitForURL: (url: RegExp | string, options?: { timeout?: number }) => page.waitForURL(url, options),
    evaluate: <R, A>(fn: (arg: A) => R | Promise<R>, arg?: A) => page.evaluate(fn as any, arg) as Promise<R>,
    locator: (selector: string) => page.locator(selector),
    url: async () => page.url(),
  };
  return { app, screen: page, browser };
}
