// npm run bdd:auth — prepares the saved sessions the BDD features use (@as-<role> tags).
// Reuses every saved session whose token still works; signs in only the stale or missing ones, at most
// SIGN_INS_PER_WINDOW (default 9) per minute, so the run never hits the staging sign-in limit (HTTP 429).
//   npm run bdd:auth                 all roles used in src/features/
//   npm run bdd:auth -- --force      sign every role in again (still paced)
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import '../src/utils/env';
import { isStateValid, signInAndSave } from '../src/support/auth-state';
import { account } from '../src/testdata';

function featureFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? featureFiles(path) : path.endsWith('.feature') ? [path] : [];
  });
}

const roles = [...new Set(featureFiles('src/features').flatMap((file) => [...readFileSync(file, 'utf8').matchAll(/@as-([a-z0-9-]+)/g)].map((m) => m[1])))].sort();
const force = process.argv.includes('--force');
const browser = await chromium.launch();
const summary: string[] = [];
let failed = false;
for (const role of roles) {
  // A role whose account is not in .env yet (new case, `npm run bdd:accounts` not run) is skipped, not fatal: only its
  // scenarios fail, with «No saved session …», and no sign-in slot is spent on an empty e-mail.
  if (!account(role).username) { summary.push(`NO ACCOUNT ${role} (QA_USER_${role.toUpperCase().replace(/-/g, '_')} missing in .env: npm run bdd:accounts)`); continue; }
  if (!force && (await isStateValid(browser, role))) { summary.push(`reused     ${role}`); continue; }
  const status = await signInAndSave(browser, role);
  summary.push(`${status === 200 ? 'signed in ' : `FAILED ${status}`} ${role}`);
  if (status !== 200) failed = true;
}
await browser.close();
console.log(summary.join('\n'));
if (failed) { console.error('bdd:auth: some sessions could not be saved (429 = wait a minute and run again)'); process.exit(1); }
