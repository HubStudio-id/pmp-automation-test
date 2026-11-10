// Session checks after «Keluar» (PMP-484): the old access token and remember token are read from the signed-in page
// before logout and replayed against Core afterwards. Tokens stay in memory and are never printed or attached.
import { urls } from '../testdata';

type Browser = { evaluate: (fn: any, arg?: any) => Promise<any> };
export type Portal = 'admin' | 'member' | 'vendor';
export type SessionTokens = { access: string; remember: string; entityHeaders: Record<string, string> };

const AUTH = {
  admin: { access: 'mlm_auth_token', remember: 'mlm_remember_token', me: '/admin/auth/me', refresh: '/admin/auth/refresh' },
  member: { access: 'member_token', remember: 'member_remember_token', me: '/member/auth/me', refresh: '/member/auth/refresh' },
  vendor: { access: 'vendor_access_token', remember: 'vendor_remember_token', me: '/vendor/auth/me', refresh: '/auth/refresh' },
} as const;

/** The tokens the portal stored at sign-in. */
export async function readSessionTokens(browser: Browser, portal: Portal): Promise<SessionTokens> {
  const keys = AUTH[portal];
  return browser.evaluate(({ access, remember }: { access: string; remember: string }) => {
    // The entity header the portal sends with its own calls (X-Vendor-Code / X-Member-Code); gone after logout.
    const vendor = JSON.parse(localStorage.getItem('vendor_user') ?? '{}');
    const member = JSON.parse(localStorage.getItem('member_user') ?? '{}');
    // Same order as the Vendor portal: tenant selector, then vendor code, then principal code.
    const vendorCode = vendor?.vendor_tenant_selector || vendor?.vendor_code || vendor?.principal_code || vendor?.vendor?.code || '';
    const memberCode = member?.member?.code ?? member?.member_code ?? '';
    return {
      access: localStorage.getItem(access) ?? '', remember: localStorage.getItem(remember) ?? '',
      entityHeaders: { ...(vendorCode ? { 'X-Vendor-Code': vendorCode } : {}), ...(memberCode ? { 'X-Member-Code': memberCode } : {}) },
    };
  }, { access: keys.access, remember: keys.remember });
}

/** Status of «who am I» with the given access token (200 = the session still lives). */
export async function meStatus(browser: Browser, portal: Portal, tokens: SessionTokens): Promise<number> {
  return browser.evaluate(async ({ api, path, token, headers }: { api: string; path: string; token: string; headers: Record<string, string> }) => {
    const response = await fetch(api + path, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', ...headers } });
    return response.status;
  }, { api: urls.api, path: AUTH[portal].me, token: tokens.access, headers: tokens.entityHeaders });
}

/** Status of a refresh with the given remember token, and whether it handed out a new access token. */
export async function refreshWith(browser: Browser, portal: Portal, rememberToken: string): Promise<{ status: number; newToken: boolean }> {
  return browser.evaluate(async ({ api, path, token }: Record<string, string>) => {
    const response = await fetch(api + path, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ remember_token: token }) });
    const body = await response.json().catch(() => null);
    const data = body?.data ?? {};
    return { status: response.status, newToken: Boolean(data.token ?? data.access_token ?? data.accessToken) };
  }, { api: urls.api, path: AUTH[portal].refresh, token: rememberToken });
}
