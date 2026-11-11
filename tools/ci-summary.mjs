// Builds the Slack message (Block Kit JSON) for one CI run from the generated Allure report and the run log.
//   node tools/ci-summary.mjs [--out slack.json] [--text]
// Inputs:
//   reports/pmp-<kind>/allure-report/data/test-results/*.json   one file per attempt (retries included)
//   reports/pmp-<kind>/run.log                                   output of the phase runner (page reloads, failed requests, rate-limit waits)
//   GITHUB_* env (run URL, branch, sha, actor, event), PAGES_URL, RUN_STARTED_AT (ISO), REPORT_KIND
// --text prints a plain preview instead of JSON. Only counts, scenario names, error first lines and links are sent:
// no tokens, request URLs or screenshots.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : undefined; };
const env = process.env;
const kind = env.REPORT_KIND === 'regression' ? 'regression' : 'smoke';
const root = env.REPORT_ROOT ?? `reports/pmp-${kind}`;
const resultsDir = `${root}/allure-report/data/test-results`;
const logPath = `${root}/run.log`;

// ---- results -------------------------------------------------------------------------------------------------------
const attempts = existsSync(resultsDir)
  ? readdirSync(resultsDir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${resultsDir}/${f}`, 'utf8')))
  : [];
const label = (t, name) => t.labels?.find((l) => l.name === name)?.value;
const tags = (t) => (t.labels ?? []).filter((l) => l.name === 'tag').map((l) => l.value);
const firstLine = (s = '') => s.replace(/^Error:\s*/, '').split('\n').map((l) => l.trim()).find(Boolean)?.slice(0, 160) ?? '';
/** «Expected: 401 · Received: 200» when the assertion message carries them. */
const expectedReceived = (s = '') => {
  const exp = s.match(/^Expected[^:]*:\s*(.+)$/m)?.[1]; const rec = s.match(/^Received[^:]*:\s*(.+)$/m)?.[1];
  return exp && rec ? ` (expected ${exp.trim().slice(0, 40)}, got ${rec.trim().slice(0, 40)})` : '';
};
const failedStep = (t) => (t.steps ?? []).find((s) => s.status === 'failed' || s.status === 'broken')?.name?.replace(/^(Given|When|Then|And|But) /, '');

const tests = attempts.filter((t) => !t.isRetry).map((t) => {
  const pkg = label(t, 'package') ?? '';
  const earlier = t.retries ?? [];
  return {
    id: (label(t, 'regression-case') ?? '').replace(/^@REG-/, '') || '—',
    name: t.name,
    portal: (pkg.match(/features\.(admin|member|vendor)-portal/) ?? [])[1] ?? 'other',
    priority: label(t, 'priority') ?? '—',
    severity: label(t, 'severity') ?? '—',
    status: t.status, // passed | failed | broken | skipped | unknown
    duration: t.duration ?? 0,
    error: firstLine(t.error?.message) + expectedReceived(t.error?.message),
    attempts: 1 + earlier.length,
    step: failedStep(t),
    flaky: t.status === 'passed' && earlier.some((r) => r.status !== 'passed'),
    firstError: firstLine(earlier.find((r) => r.status !== 'passed')?.error?.message),
  };
});
const isBad = (t) => t.status === 'failed' || t.status === 'broken';
const bad = tests.filter(isBad);
const flaky = tests.filter((t) => t.flaky);
const passed = tests.filter((t) => t.status === 'passed');
const skipped = tests.filter((t) => !isBad(t) && t.status !== 'passed');

// ---- run log -------------------------------------------------------------------------------------------------------
const log = existsSync(logPath) ? readFileSync(logPath, 'utf8') : '';
// src/support/adapter.ts logs «[app.open] /path stayed blank …» and «[app.open] /path: net::ERR_… ; loading it again».
const reloads = [...log.matchAll(/\[app\.open\] (\S+?):? (?:stayed blank|net::\S+)/g)].map((m) => m[1]);
const networkGiveUps = (log.match(/\[network\] /g) ?? []).length;
const waits = [...log.matchAll(/\[rate-limit\].*waiting (\d+)s/g)].map((m) => +m[1]);

// ---- formatting ----------------------------------------------------------------------------------------------------
const secs = (ms) => { const s = Math.round(ms / 1000); return s >= 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s}s`; };
const wib = (d) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d).replace('.', ':');
const by = (key, order) => order.map((v) => [v, tests.filter((t) => t[key] === v)]).filter(([, l]) => l.length);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MAX = 10;

const server = env.GITHUB_SERVER_URL ?? 'https://github.com';
const repo = env.GITHUB_REPOSITORY ?? 'HubStudio-id/pmp-automation-test';
const runUrl = env.GITHUB_RUN_ID ? `${server}/${repo}/actions/runs/${env.GITHUB_RUN_ID}` : env.RUN_URL;
const sha = (env.GITHUB_SHA ?? '').slice(0, 7) || env.SHA;
const commitTitle = env.COMMIT_TITLE ?? (() => { try { return execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim(); } catch { return ''; } })();
// On a pull request GITHUB_REF_NAME is «<n>/merge»; GITHUB_HEAD_REF holds the PR's branch.
const branch = env.GITHUB_HEAD_REF || env.GITHUB_REF_NAME || env.BRANCH || 'main';
const trigger = { push: 'push', schedule: 'schedule (weekly)', workflow_dispatch: 'manual', pull_request: 'pull request' }[env.GITHUB_EVENT_NAME] ?? env.GITHUB_EVENT_NAME ?? 'manual';
const started = env.RUN_STARTED_AT ? new Date(env.RUN_STARTED_AT) : undefined;
const ended = env.RUN_ENDED_AT ? new Date(env.RUN_ENDED_AT) : new Date();
// Same title as the Allure report (tools/generate-allure-report.mjs), so Slack and Allure read alike.
const suite = kind === 'regression' ? 'PMP - Regression Test Report' : 'PMP - Smoke Test Report';

const verdict = !tests.length ? 'NO RESULTS' : bad.length ? 'FAILED' : 'PASSED';
const head = !tests.length ? '⚪' : bad.length ? '🔴' : flaky.length ? '🟡' : '🟢';
const passRate = tests.length ? Math.round((passed.length / tests.length) * 1000) / 10 : 0;
const rateTag = tests.length ? ` (${passRate}%)` : ''; // pass rate next to «Test Summary»; none when there are no results

const scenarioLine = (t, extra) => `• *${t.id}* ${t.priority} · ${esc(t.name)}${extra ? `\n    ${extra}` : ''}`;
const list = (items, render) => [...items.slice(0, MAX).map(render), ...(items.length > MAX ? [`_+${items.length - MAX} more in the Allure report_`] : [])].join('\n');

const blocks = [];
const section = (text) => blocks.push({ type: 'section', text: { type: 'mrkdwn', text } });
const context = (text) => blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text }] });
const divider = () => blocks.push({ type: 'divider' });

blocks.push({ type: 'header', text: { type: 'plain_text', text: `${head} ${suite} — ${verdict}`, emoji: true } });
context([
  `*${branch}* · \`${sha}\`${commitTitle ? ` ${esc(commitTitle)}` : ''}`,
  `${trigger}${env.GITHUB_ACTOR ? ` by ${env.GITHUB_ACTOR}` : ''}`,
  started ? `${wib(started)} – ${wib(ended).split(', ').pop()} WIB (${secs(ended - started)})` : `${wib(ended)} WIB`,
].join('  |  '));

// Test summary: the totals, then one line per portal. A group only gets a mark when something in it
// failed, so an all-green run reads as plain numbers.
const tally = (l) => `${l.filter((t) => t.status === 'passed').length}/${l.length}${l.some(isBad) ? ` ❌ ${l.filter(isBad).length}` : ''}`;
const cap = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;
const breakdown = (key, order, name = (v) => v) => by(key, order).map(([v, l]) => `• ${name(v)} ${tally(l)}`).join('\n');
section([
  `*Test Summary*${rateTag}`,
  `✅ ${passed.length} passed`,
  `❌ ${bad.length} failed`,
  ...(skipped.length ? [`⏭️ ${skipped.length} skipped`] : []),
  ...(flaky.length ? [`🔁 ${flaky.length} passed on retry`] : []),
  '',
  '*Portal*',
  breakdown('portal', ['admin', 'member', 'vendor', 'other'], cap),
].join('\n'));

if (bad.length) {
  divider();
  section(`*❌ Failed (${bad.length})*\n${list(bad, (t) => scenarioLine(t, `${t.step ? `_${esc(t.step)}_ → ` : ''}\`${esc(t.error)}\`${t.attempts > 1 ? ` · failed ${t.attempts}/${t.attempts} attempts` : ''}`))}`);
}
if (flaky.length) {
  divider();
  section(`*🔁 Passed on retry (${flaky.length})*: first attempt failed, usually the staging connection\n${list(flaky, (t) => scenarioLine(t, `1st attempt: \`${esc(t.firstError || 'no message')}\``))}`);
}

divider();
const slow = [...tests].sort((a, b) => b.duration - a.duration).slice(0, 3).map((t) => `• ${t.id} ${secs(t.duration)}`).join('\n');
const health = [
  `${reloads.length ? '⚠️' : '✅'} Blank-page reloads: *${reloads.length}*${reloads.length ? ` (${[...new Set(reloads)].slice(0, 5).join(', ')})` : ''}`,
  `${networkGiveUps ? '❌' : '✅'} Requests failed after 3 tries: *${networkGiveUps}*`,
  `⏳ Sign-in rate-limit waits: *${waits.length}* (${waits.reduce((a, b) => a + b, 0)}s total)`,
].join('\n');
section(`*Slowest scenarios*\n${slow}\n\n*Staging connection (CI → staging)*\n${health}`);

const buttons = [
  env.PAGES_URL && { text: '📊 Allure report', url: env.PAGES_URL, style: 'primary' },
  runUrl && { text: '⚙️ GitHub run', url: runUrl },
  runUrl && { text: '📦 Artifacts', url: `${runUrl}#artifacts` },
].filter(Boolean);
if (buttons.length) blocks.push({ type: 'actions', elements: buttons.map(({ text, url, style }) => ({ type: 'button', text: { type: 'plain_text', text, emoji: true }, url, ...(style ? { style } : {}) })) });

const fallback = `${head} ${suite} — ${verdict}: ${passed.length}/${tests.length} passed, ${bad.length} failed, ${flaky.length} flaky`;
const message = { text: fallback, blocks };

if (process.argv.includes('--text')) {
  const plain = (b) => b.text?.text ?? b.fields?.map((f) => f.text.replace('\n', ': ')).join('   ') ?? b.elements?.map((e) => e.text?.text ?? e.text).join('   ') ?? '';
  console.log(blocks.map((b) => (b.type === 'divider' ? '────────' : b.type === 'actions' ? `[${b.elements.map((e) => e.text.text).join('] [')}]` : plain(b))).join('\n'));
} else {
  const out = arg('--out');
  if (out) writeFileSync(out, JSON.stringify(message)); else console.log(JSON.stringify(message));
}
