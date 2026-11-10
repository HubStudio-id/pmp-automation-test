// Runs the regression in phases with saved sessions prepared once (npm run bdd:auth).
//   node tools/run-bdd-phases.mjs        full run: main set ‖ lockout, then the sign-in form scenarios
//   node tools/run-bdd-phases.mjs --p1   P1 sanity: main P1 set, then the P1 sign-in form scenarios
// Why this order:
// - The main set signs in nobody, so the lockout phase (its own qa+lock@ account, five sign-ins through the ledger)
//   runs beside it and its rate-limit wait overlaps the main set.
// - The sign-in form scenarios sign in and out accounts whose saved sessions the main set uses (admin-config-view,
//   member-maker), so they start only after the main set has finished.
// The lockout output goes to reports/cucumber/lockout.log while it runs and is printed after, so the two phases do
// not interleave on screen. The exit code is the first failing phase's.
import { spawn } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const env = { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --import tsx`.trim(), BDD_PLAIN: '1' };
const LOCKOUT_LOG = 'reports/cucumber/lockout.log';

function run(command, args, logPath) {
  return new Promise((resolve) => {
    const log = logPath ? createWriteStream(logPath, { mode: 0o600 }) : undefined;
    const child = spawn(command, args, { stdio: log ? ['ignore', 'pipe', 'pipe'] : 'inherit', env });
    if (log) { child.stdout.pipe(log); child.stderr.pipe(log); }
    child.once('error', () => resolve(1));
    child.once('close', (code) => { log?.end(); resolve(code ?? 1); });
  });
}
const cucumber = (profile, logPath) => run(npx, ['cucumber-js', '--profile', profile], logPath);
const timed = async (label, promise) => {
  const started = Date.now();
  const code = await promise;
  console.log(`[phase] ${label}: exit ${code}, ${Math.round((Date.now() - started) / 1000)} s`);
  return code;
};

mkdirSync('reports/cucumber', { recursive: true });
const auth = await timed('sessions', run(npm, ['run', 'bdd:auth']));
if (auth !== 0) {
  process.exitCode = auth;
} else if (process.argv.includes('--p1')) {
  const main = await timed('P1 main', cucumber('p1'));
  const signIn = await timed('P1 sign-in form', cucumber('p1signin'));
  process.exitCode = main || signIn;
} else {
  const [main, lockout] = await Promise.all([
    timed('main', cucumber('default')),
    timed('lockout', cucumber('lockout', LOCKOUT_LOG)),
  ]);
  console.log(`\n--- lockout phase output (${LOCKOUT_LOG}) ---\n${readFileSync(LOCKOUT_LOG, 'utf8')}`);
  const signIn = await timed('sign-in form', cucumber('signin'));
  process.exitCode = main || lockout || signIn;
}
