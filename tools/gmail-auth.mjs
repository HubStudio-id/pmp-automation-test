#!/usr/bin/env node
// One-time Gmail API consent for the regression's invitation e-mails (read-only scope).
// Reads GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET from .env, opens Google's consent page in your browser,
// and writes GMAIL_REFRESH_TOKEN back into .env. Nothing secret is printed.
// Run: node tools/gmail-auth.mjs   (sign in as qa@hubstudio.id and click Allow)
import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';

const ENV_FILE = new URL('../.env', import.meta.url);
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
const env = Object.fromEntries(readFileSync(ENV_FILE, 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const { GMAIL_CLIENT_ID: clientId, GMAIL_CLIENT_SECRET: clientSecret } = env;
if (!clientId || !clientSecret) { console.error('gmail-auth: fill GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env first'); process.exit(1); }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const code = url.searchParams.get('code');
  if (!code) { res.end('No code'); return; }
  const redirectUri = `http://127.0.0.1:${server.address().port}`;
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const tokens = await tokenResponse.json();
  if (!tokens.refresh_token) { res.end('No refresh token returned; see terminal.'); console.error('gmail-auth: no refresh_token (', tokens.error ?? tokenResponse.status, ')'); server.close(); process.exit(1); }
  const text = readFileSync(ENV_FILE, 'utf8').replace(/^GMAIL_REFRESH_TOKEN=.*$/m, `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
  writeFileSync(ENV_FILE, text, { mode: 0o600 });
  res.end('Gmail access saved. You can close this tab.');
  console.log('gmail-auth: GMAIL_REFRESH_TOKEN saved in .env (read-only scope).');
  server.close();
});

server.listen(0, '127.0.0.1', () => {
  const consent = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  consent.search = new URLSearchParams({
    client_id: clientId, redirect_uri: `http://127.0.0.1:${server.address().port}`, response_type: 'code',
    scope: SCOPE, access_type: 'offline', prompt: 'consent', login_hint: 'qa@hubstudio.id',
  }).toString();
  console.log('gmail-auth: opening Google consent in your browser (sign in as qa@hubstudio.id, click Allow)…');
  execFile('open', [consent.toString()]);
});
