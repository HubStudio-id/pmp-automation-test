// Reads invitation e-mails sent to qa+…@hubstudio.id through the Gmail API (read-only), with the refresh token
// saved by tools/gmail-auth.mjs. Runs in the test process; the token never reaches the browser or a report.
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL = 'https://gmail.googleapis.com/gmail/v1/users/me';

async function accessToken(): Promise<string> {
  const { GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN } = process.env;
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) throw new Error('Gmail API not configured: run node tools/gmail-auth.mjs');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: GMAIL_CLIENT_ID, client_secret: GMAIL_CLIENT_SECRET, refresh_token: GMAIL_REFRESH_TOKEN, grant_type: 'refresh_token' }),
  });
  return (await response.json()).access_token;
}

function decode(part: any): string {
  if (part?.body?.data) return Buffer.from(part.body.data, 'base64url').toString('utf8');
  return (part?.parts ?? []).map(decode).join('\n');
}

/**
 * Waits for the newest e-mail to `recipient` (sent after `since`) and returns its text.
 * Polls the Gmail API: the e-mail is the event being waited for, there is no push channel in a test.
 */
export async function waitForEmail(recipient: string, since: Date, timeoutMs = 120_000): Promise<string> {
  const token = await accessToken();
  const query = encodeURIComponent(`to:${recipient} after:${Math.floor(since.getTime() / 1000) - 60}`);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await (await fetch(`${GMAIL}/messages?q=${query}&maxResults=1`, { headers: { Authorization: `Bearer ${token}` } })).json();
    const id = list.messages?.[0]?.id;
    if (id) {
      const message = await (await fetch(`${GMAIL}/messages/${id}?format=full`, { headers: { Authorization: `Bearer ${token}` } })).json();
      return decode(message.payload);
    }
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  throw new Error(`no e-mail to ${recipient} within ${timeoutMs / 1000}s`);
}

/** The text of the newest e-mail to `recipient` whose subject contains `subject`, however old (e.g. a used invitation). */
export async function latestEmail(recipient: string, subject: string): Promise<string> {
  const token = await accessToken();
  const query = encodeURIComponent(`to:${recipient} subject:"${subject}"`);
  const list = await (await fetch(`${GMAIL}/messages?q=${query}&maxResults=1`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const id = list.messages?.[0]?.id;
  if (!id) throw new Error(`no e-mail «${subject}» to ${recipient}`);
  const message = await (await fetch(`${GMAIL}/messages/${id}?format=full`, { headers: { Authorization: `Bearer ${token}` } })).json();
  return decode(message.payload);
}

/** The first link in an e-mail whose URL matches `pattern` (e.g. the invitation link). */
export function linkIn(emailText: string, pattern: RegExp): string {
  const link = (emailText.match(/https?:\/\/[^\s"'<>)]+/g) ?? []).find((url) => pattern.test(url));
  if (!link) throw new Error(`no link matching ${pattern} in the e-mail`);
  return link.replace(/&amp;/g, '&');
}
