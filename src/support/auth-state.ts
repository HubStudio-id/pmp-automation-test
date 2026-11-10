// Saved Playwright storage state per account (.auth/<role>.json). A state is reused across runs while its token is
// still accepted; only stale or missing ones sign in again — the main defence against the sign-in rate limit.
import { existsSync, readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import type { Browser } from 'playwright';
import { account, urls } from '../testdata';
import { LoginPage, type Portal } from '../pages';
import { fixturesFor } from './adapter';
import { reserveSignIns } from './sign-in-ledger';

const CHECK = {
  admin: { home: () => `${urls.admin}/`, token: 'mlm_auth_token', path: '/account' },
  member: { home: () => `${urls.member}/dashboard`, token: 'member_token', path: '/member/notifications/unread-count' },
  vendor: { home: () => `${urls.vendor}/dashboard`, token: 'vendor_access_token', path: '/vendor/auth/me' },
} as const;

export const statePath = (role: string) => `.auth/${role}.json`;

/** Portal of a role handle: admin-…, member-…, vendor-…. */
export function portalOf(role: string): Portal {
  return role.split('-')[0] as Portal;
}

/** True when the saved state exists and its token still answers 200 on a cheap authenticated API. */
export async function isStateValid(browser: Browser, role: string): Promise<boolean> {
  if (!existsSync(statePath(role))) return false;
  const check = CHECK[portalOf(role)];
  const context = await browser.newContext({ storageState: statePath(role) });
  try {
    const page = await context.newPage();
    await page.goto(check.home());
    const status = await page.evaluate(async ({ api, path, key }) => {
      const token = localStorage.getItem(key);
      if (!token) return 0;
      const response = await fetch(api + path, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
      return response.status;
    }, { api: urls.api, path: check.path, key: check.token });
    return status === 200;
  } catch {
    return false;
  } finally {
    await context.close();
  }
}

/** Signs in through the UI (paced by the ledger) and saves the storage state. Returns the login API status. */
export async function signInAndSave(browser: Browser, role: string): Promise<number> {
  await reserveSignIns(1, role);
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const status = await new LoginPage(fixturesFor(page), portalOf(role)).signInAs(account(role), { rememberMe: true });
    if (status === 200) {
      mkdirSync('.auth', { recursive: true, mode: 0o700 });
      await context.storageState({ path: statePath(role) });
      chmodSync(statePath(role), 0o600); // the state holds the session token
    }
    return status;
  } finally {
    await context.close();
  }
}

/** Storage state for one or more roles merged into one (each portal is its own origin). */
export function mergedState(roles: string[]) {
  const states = roles.map((role) => JSON.parse(readFileSync(statePath(role), 'utf8')));
  return {
    cookies: states.flatMap((state) => state.cookies ?? []),
    origins: states.flatMap((state) => state.origins ?? []),
  };
}

export function writeJson(path: string, value: unknown) {
  writeFileSync(path, JSON.stringify(value, null, 2), { mode: 0o600 });
}
