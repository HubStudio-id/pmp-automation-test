// Member API calls made from inside the signed-in Member page: the token never leaves the browser.
import { urls } from '../testdata';

type Browser = { evaluate: (fn: any, arg?: any) => Promise<any> };

/** GET a member API path as JSON (X-Member-Code from the signed-in member). */
export async function memberGet(browser: Browser, path: string): Promise<{ status: number; body: any }> {
  return browser.evaluate(async ({ api, path }: { api: string; path: string }) => {
    const user = JSON.parse(localStorage.getItem('member_user') ?? '{}');
    const memberCode = user?.member?.code ?? user?.member_code ?? '';
    const response = await fetch(api + path, {
      headers: { Authorization: `Bearer ${localStorage.getItem('member_token') ?? ''}`, Accept: 'application/json', 'X-Member-Code': memberCode },
    });
    return { status: response.status, body: response.ok ? await response.json() : null };
  }, { api: urls.api, path });
}

/** Sends a JSON request to a member API path from the signed-in Member page. */
export async function memberRequest(browser: Browser, method: 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown): Promise<{ status: number; body: any }> {
  return browser.evaluate(async ({ api, method, path, body }: { api: string; method: string; path: string; body: string | null }) => {
    const user = JSON.parse(localStorage.getItem('member_user') ?? '{}');
    const memberCode = user?.member?.code ?? user?.member_code ?? '';
    let lastError = 'unknown network error';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(api + path, {
          method,
          headers: { Authorization: `Bearer ${localStorage.getItem('member_token') ?? ''}`, Accept: 'application/json', 'Content-Type': 'application/json', ...(memberCode ? { 'X-Member-Code': memberCode } : {}) },
          body: body ?? undefined,
        });
        const text = await response.text();
        let parsed: unknown = null;
        try { parsed = JSON.parse(text); } catch { parsed = null; }
        return { status: response.status, body: parsed };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw new Error(`member API ${method} ${path} failed after 3 attempts: ${lastError}`);
  }, { api: urls.api, method, path, body: body === undefined ? null : JSON.stringify(body) });
}

/** Downloads a member API download path (JSON { data: { url } } with a signed URL, or the file itself) as base64. */
export async function memberDownloadBase64(browser: Browser, downloadPath: string): Promise<string> {
  return browser.evaluate(async ({ api, downloadPath }: { api: string; downloadPath: string }) => {
    const user = JSON.parse(localStorage.getItem('member_user') ?? '{}');
    const memberCode = user?.member?.code ?? user?.member_code ?? '';
    const headers: Record<string, string> = { Authorization: `Bearer ${localStorage.getItem('member_token') ?? ''}`, ...(memberCode ? { 'X-Member-Code': memberCode } : {}) };
    let response = await fetch(api.replace(/\/api\/v1$/, '') + downloadPath, { headers });
    if ((response.headers.get('content-type') ?? '').includes('json')) response = await fetch((await response.json()).data.url);
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }, { api: urls.api, downloadPath });
}
