#!/usr/bin/env node
// Copies client_id / client_secret from the OAuth client JSON downloaded from Google Cloud
// (Credentials › your Desktop client › «Download JSON», file client_secret_*.json) into .env.
// Nothing secret is printed. Usage: node tools/gmail-import-client.mjs [path-to-json]
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const downloads = join(homedir(), 'Downloads');
const file = process.argv[2] ?? readdirSync(downloads)
  .filter((name) => /^client_secret_.*\.json$/.test(name))
  .map((name) => join(downloads, name))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!file) { console.error('gmail-import-client: no client_secret_*.json in ~/Downloads; pass the path'); process.exit(1); }

const json = JSON.parse(readFileSync(file, 'utf8'));
const client = json.installed ?? json.web;
if (!client?.client_id || !client?.client_secret) { console.error('gmail-import-client: the file has no installed/web client'); process.exit(1); }
if (!json.installed) console.warn('gmail-import-client: this is not a «Desktop app» client; the loopback consent may be refused');

const envFile = new URL('../.env', import.meta.url);
const text = readFileSync(envFile, 'utf8')
  .replace(/^GMAIL_CLIENT_ID=.*$/m, `GMAIL_CLIENT_ID=${client.client_id}`)
  .replace(/^GMAIL_CLIENT_SECRET=.*$/m, `GMAIL_CLIENT_SECRET=${client.client_secret}`);
writeFileSync(envFile, text, { mode: 0o600 });
console.log(`gmail-import-client: GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET saved in .env from ${file.split('/').pop()}`);
