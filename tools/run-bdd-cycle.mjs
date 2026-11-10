import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'inherit', env: process.env });
    child.once('error', () => resolve(1));
    child.once('close', (code) => resolve(code ?? 1));
  });
}

const clearCode = await run(npm, ['run', 'bdd:report:clear']);
const testCode = clearCode === 0 ? await run(process.execPath, ['tools/run-bdd-phases.mjs']) : clearCode;

// Always generate the report, including when a phase failed, so failures remain inspectable.
const reportCode = await run(npm, ['run', 'bdd:report']);
process.exitCode = clearCode || testCode || reportCode;
