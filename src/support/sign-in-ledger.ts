// Staging allows about 10 sign-ins per minute per IP (HTTP 429 above). Every sign-in made by the BDD tooling is
// recorded in .auth/sign-ins.json; before a new one, reserve() waits until fewer than SIGN_INS_PER_WINDOW happened
// in the last window. This is run orchestration (auth tool and the sign-in hooks), never a wait inside a step.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const LEDGER = '.auth/sign-ins.json';
const WINDOW_MS = 65_000;
const SIGN_INS_PER_WINDOW = Number(process.env.SIGN_INS_PER_WINDOW ?? 9);

function read(): number[] {
  try { return JSON.parse(readFileSync(LEDGER, 'utf8')); } catch { return []; }
}

/** Waits (printing why) until `count` sign-ins fit in the window, then records them. */
export async function reserveSignIns(count = 1, label = 'sign-in'): Promise<void> {
  mkdirSync('.auth', { recursive: true, mode: 0o700 });
  for (;;) {
    const now = Date.now();
    const recent = read().filter((at) => now - at < WINDOW_MS).sort((a, b) => a - b);
    if (recent.length + count <= SIGN_INS_PER_WINDOW) {
      writeFileSync(LEDGER, JSON.stringify([...recent, ...Array(count).fill(now)]), { mode: 0o600 });
      return;
    }
    const waitMs = recent[recent.length + count - SIGN_INS_PER_WINDOW - 1] + WINDOW_MS - now + 500;
    console.log(`[rate-limit] ${label}: ${recent.length} sign-ins in the last minute, waiting ${Math.ceil(waitMs / 1000)}s`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}
