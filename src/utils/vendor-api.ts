// Vendor API calls made from inside the signed-in vendor page: the bearer token never leaves the browser.
// Used where a check reads data the UI only offers as a download (generated letters, PKS parts).
import { urls } from '../testdata';

type Browser = { evaluate: (fn: any, arg?: any) => Promise<any> };

/** GET a vendor API path as JSON (X-Vendor-Code from the signed-in vendor). */
export async function vendorGet(browser: Browser, path: string): Promise<any> {
  return browser.evaluate(async ({ api, path }: { api: string; path: string }) => {
    const user = JSON.parse(localStorage.getItem('vendor_user') ?? '{}');
    const vendorCode = user?.vendor_tenant_selector || user?.vendor_code || user?.principal_code || user?.vendor?.code || ''; // same order as the portal
    let lastError = 'unknown network error';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(api + path, {
          headers: { Authorization: `Bearer ${localStorage.getItem('vendor_access_token') ?? ''}`, Accept: 'application/json', 'X-Vendor-Code': vendorCode },
        });
        return { status: response.status, body: response.ok ? await response.json() : null };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
    throw new Error(`vendor API GET ${path} failed after 3 attempts: ${lastError}`);
  }, { api: urls.api, path });
}

/** Downloads a PDF (an API download path with the vendor token, or a signed URL without it) as base64. */
export async function downloadPdfBase64(browser: Browser, pathOrUrl: string): Promise<string> {
  return browser.evaluate(async ({ api, pathOrUrl }: { api: string; pathOrUrl: string }) => {
    // An API download path answers JSON { data: { url } } with a signed URL; the signed URL takes no auth header.
    let url = pathOrUrl;
    if (!/^https?:/.test(pathOrUrl)) {
      const auth = { Authorization: `Bearer ${localStorage.getItem('vendor_access_token') ?? ''}` };
      url = (await (await fetch(api.replace(/\/api\/v1$/, '') + pathOrUrl, { headers: auth })).json()).data.url;
    }
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(binary);
  }, { api: urls.api, pathOrUrl });
}

/** Sends a JSON request to a vendor API path from the signed-in vendor page; returns the status and the JSON body. */
export async function vendorRequest(browser: Browser, method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<{ status: number; body: any }> {
  return browser.evaluate(async ({ api, method, path, body }: { api: string; method: string; path: string; body: string | null }) => {
    const user = JSON.parse(localStorage.getItem('vendor_user') ?? '{}');
    const vendorCode = user?.vendor_tenant_selector || user?.vendor_code || user?.principal_code || user?.vendor?.code || ''; // same order as the portal
    const response = await fetch(api + path, {
      method,
      headers: { Authorization: `Bearer ${localStorage.getItem('vendor_access_token') ?? ''}`, Accept: 'application/json', 'Content-Type': 'application/json', 'X-Vendor-Code': vendorCode },
      body: body ?? undefined,
    });
    const text = await response.text();
    let parsed: unknown = null;
    try { parsed = JSON.parse(text); } catch { parsed = null; }
    return { status: response.status, body: parsed };
  }, { api: urls.api, method, path, body: body === undefined ? null : JSON.stringify(body) });
}
