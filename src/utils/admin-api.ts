// Admin API calls made from inside the signed-in Admin page: the bearer token never leaves the browser.
import { urls } from '../testdata';

type Browser = { evaluate: (fn: any, arg?: any) => Promise<any> };

export async function adminRequest(browser: Browser, method: 'GET' | 'POST', path: string, body?: unknown): Promise<{ status: number; body: any }> {
  return browser.evaluate(async ({ api, method, path, body }: { api: string; method: string; path: string; body: string | null }) => {
    let lastError = 'unknown network error';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(api + path, {
          method,
          headers: { Authorization: `Bearer ${localStorage.getItem('mlm_auth_token') ?? ''}`, Accept: 'application/json', 'Content-Type': 'application/json' },
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
    throw new Error(`admin API ${method} ${path} failed after 3 attempts: ${lastError}`);
  }, { api: urls.api, method, path, body: body === undefined ? null : JSON.stringify(body) });
}

/** Posts an Admin sign-in from the page (no token involved) and returns the status and the error message. */
export async function adminLoginAttempt(browser: Browser, email: string, password: string): Promise<{ status: number; message: string }> {
  return browser.evaluate(async ({ api, email, password }: { api: string; email: string; password: string }) => {
    const response = await fetch(`${api}/admin/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json().catch(() => ({}));
    return { status: response.status, message: String(body?.message ?? body?.error ?? '') };
  }, { api: urls.api, email, password });
}

/** The first AX creditor code under the given prefixes that Core still accepts for a new invitation. */
export async function findFreeAxCreditorCode(browser: Browser, prefixes: string[], entityType = 'distributor'): Promise<string> {
  for (const prefix of prefixes) {
    const list = await adminRequest(browser, 'GET', `/admin/ax-masters?kind=vendor&q=${encodeURIComponent(prefix)}&per_page=50`);
    for (const row of list.body?.data ?? []) {
      const match = await adminRequest(browser, 'POST', '/admin/vendor-invitations/ax-match', { entity_type: entityType, ax_creditor_code: row.code });
      if (match.status === 200) return row.code;
    }
  }
  throw new Error(`no free AX creditor code under ${prefixes.join(', ')}`);
}

/** Status of a GET on an API path (e.g. «/api/v1/admin/…»), sent with the admin token or without any credentials. */
export async function adminPathStatus(browser: Browser, apiPath: string, withSession: boolean): Promise<number> {
  return browser.evaluate(async ({ origin, apiPath, withSession }: { origin: string; apiPath: string; withSession: boolean }) => {
    const headers: Record<string, string> = { Accept: '*/*' };
    if (withSession) headers.Authorization = `Bearer ${localStorage.getItem('mlm_auth_token') ?? ''}`;
    const response = await fetch(origin + apiPath, { headers, credentials: 'omit', redirect: 'manual' });
    return response.status;
  }, { origin: new URL(urls.api).origin, apiPath, withSession });
}

/** Downloads an API file path with the admin token and returns it as base64. */
export async function adminDownloadBase64(browser: Browser, path: string): Promise<{ status: number; base64: string }> {
  return browser.evaluate(async ({ api, path }: { api: string; path: string }) => {
    const response = await fetch(api + path, { headers: { Authorization: `Bearer ${localStorage.getItem('mlm_auth_token') ?? ''}` } });
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { status: response.status, base64: btoa(binary) };
  }, { api: urls.api, path });
}

/** Uploads a DOCX (base64) as a new template version through the API; used only to restore a template. */
export async function adminUploadTemplateVersion(browser: Browser, templateSlug: string, base64: string, fileName: string, versionLabel: string, note: string): Promise<number> {
  return browser.evaluate(async ({ api, templateSlug, base64, fileName, versionLabel, note }: Record<string, string>) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), fileName);
    form.append('version_label', versionLabel);
    form.append('note', note);
    const response = await fetch(`${api}/admin/document-templates/${encodeURIComponent(templateSlug)}/versions`, {
      method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('mlm_auth_token') ?? ''}`, Accept: 'application/json' }, body: form,
    });
    return response.status;
  }, { api: urls.api, templateSlug, base64, fileName, versionLabel, note });
}
