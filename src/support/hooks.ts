// Browser lifecycle, sessions by tag and evidence screenshots. Data fixtures by tag live in fixtures.ts.
//   @as-<role>          restore the saved session of that account (several tags = one context signed in to each portal)
//   @sign-ins-<n>       the scenario signs in n times itself (form tests): wait for room in the rate-limit window first
import { Before, After, BeforeAll, AfterAll, Status } from '@cucumber/cucumber';
import { chromium, type Browser } from 'playwright';
import { existsSync, mkdirSync, chmodSync } from 'node:fs';
import '../utils/env';
import { RegressionWorld } from './world';
import { fixturesFor } from './adapter';
import { mergedState, statePath } from './auth-state';
import { reserveSignIns } from './sign-in-ledger';
import { registerFixtureHooks } from './fixtures';

let browser: Browser;
const reportKind = process.env.REPORT_KIND === 'smoke' ? 'smoke' : 'regression';
const TRACE_DIR = `reports/pmp-${reportKind}/traces`;

BeforeAll(async function () {
  browser = await chromium.launch({ headless: process.env.HEADED !== '1' });
});

AfterAll(async function () {
  await browser?.close();
});

Before(async function (this: RegressionWorld, { pickle }) {
  const tags = pickle.tags.map((tag) => tag.name);
  const roles = tags.filter((tag) => tag.startsWith('@as-')).map((tag) => tag.slice(4));
  const missing = roles.filter((role) => !existsSync(statePath(role)));
  if (missing.length) throw new Error(`No saved session for ${missing.join(', ')}: run «npm run bdd:auth» first (a new account needs «npm run bdd:accounts» before that)`);
  const signIns = Number(tags.find((tag) => tag.startsWith('@sign-ins-'))?.slice(10) ?? 0);
  if (signIns) await reserveSignIns(signIns, pickle.name);
  this.context = await browser.newContext({
    storageState: roles.length ? mergedState(roles) : undefined,
    viewport: { width: 1280, height: 720 },
  });
  this.page = await this.context.newPage();
  this.f = fixturesFor(this.page);
  // Playwright trace (steps, DOM snapshots, network) for debugging failures. Not for scenarios that type a password
  // themselves (@sign-ins-<n>): a trace records typed values. BDD_TRACE=0 turns tracing off.
  this.tracing = process.env.BDD_TRACE !== '0' && !signIns;
  if (this.tracing) await this.context.tracing.start({ screenshots: true, snapshots: true, sources: false });
});

// After hooks run in reverse order of registration: evidence (registered last) runs first, then the data clean-up,
// then the context closes (registered first).
After(async function (this: RegressionWorld) {
  await this.context?.close();
});
registerFixtureHooks(() => browser);
After(async function (this: RegressionWorld, { pickle, result }) {
  if (!this.page) return;
  const screenshot = await this.page.screenshot({ fullPage: true });
  this.attach(screenshot, 'image/png');
  const failed = result?.status === Status.FAILED;
  if (failed) this.attach(`URL at failure: ${this.page.url()}`, 'text/plain');
  if (!this.tracing) return;
  if (!failed) { await this.context.tracing.stop(); return; }
  // Kept only for failures. The trace holds request headers (Bearer tokens) and page data: mode 600, never share it.
  mkdirSync(TRACE_DIR, { recursive: true, mode: 0o700 });
  const id = pickle.tags.map((t) => t.name).find((t) => t.startsWith('@REG-'))?.slice(1) ?? 'scenario';
  const path = `${TRACE_DIR}/${id}_${pickle.name.replace(/[^A-Za-z0-9]+/g, '-').slice(0, 60)}_${Date.now()}.zip`;
  await this.context.tracing.stop({ path });
  chmodSync(path, 0o600);
  this.attach(`Playwright trace: ${path}\nOpen: npm run bdd:trace -- ${path}`, 'text/plain');
});
