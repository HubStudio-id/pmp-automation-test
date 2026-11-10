// Loads .env (portal URLs, QA_USER_/QA_PASS_ accounts, Gmail API values) into process.env for Cucumber runs.
// Values are never printed. Variables already set in the shell win.
import { readFileSync, statSync } from 'node:fs';

for (const file of ['.env']) {
  let text = '';
  try {
    if ((statSync(file).mode & 0o077) !== 0) throw new Error(`${file} must be mode 600 (chmod 600 ${file})`);
    text = readFileSync(file, 'utf8');
  } catch (error: any) {
    if (error?.code === 'ENOENT') continue;
    throw error;
  }
  for (const line of text.split('\n')) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2];
  }
}
