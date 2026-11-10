import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const marker = 'reports/.last-run-kind';
const markedKind = existsSync(marker) ? readFileSync(marker, 'utf8').trim() : '';
const kind = process.env.REPORT_KIND === 'smoke' || markedKind === 'smoke' ? 'smoke' : 'regression';
const projectName = 'pmp';
const title = kind === 'smoke' ? 'PMP - Smoke Test Report' : 'PMP - Regression Test Report';
const root = `reports/pmp-${kind}`;
const resultsDir = `${root}/allure-results`;
const reportDir = `${root}/allure-report`;

if (!existsSync(resultsDir) || !readdirSync(resultsDir).some((file) => file.endsWith('-result.json'))) {
  console.error(`No Allure result files found in ${resultsDir}.`);
  process.exit(1);
}

// Allure Cucumber uses package.json.name as the top-level package group. Rewrite the generated result metadata for
// smoke runs so the report tree follows the selected suite instead of always showing pmp-regression.
for (const file of readdirSync(resultsDir).filter((name) => name.endsWith('-result.json'))) {
  const path = `${resultsDir}/${file}`;
  const result = JSON.parse(readFileSync(path, 'utf8'));
  if (typeof result.fullName === 'string') result.fullName = result.fullName.replace(/^pmp(?:-regression|-smoke):/, `${projectName}:`);
  if (Array.isArray(result.labels)) {
    for (const label of result.labels) {
      if (label.name === 'package' && typeof label.value === 'string') {
        label.value = label.value.replace(/^pmp(?:-regression|-smoke)\./, `${projectName}.`);
      }
    }
  }
  writeFileSync(path, `${JSON.stringify(result)}\n`);
}

const args = ['allure', 'generate', resultsDir, '--output', reportDir, '--clean', '--name', title];
if (process.env.OPEN_REPORT === '1') args.push('--open', '--host', '127.0.0.1');

const child = spawn(npm, args, { stdio: 'inherit', env: process.env });
child.once('error', () => process.exit(1));
child.once('close', (code) => process.exit(code ?? 1));
