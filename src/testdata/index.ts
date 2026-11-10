// Loads src/testdata/test-data.json once. Tests import `data` instead of hardcoding names, e-mails or inputs.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const data = JSON.parse(readFileSync(join(process.cwd(), 'src/testdata/test-data.json'), 'utf8'));

/** Portal URLs, read when used (the Cucumber runner loads .env before the first step, after this module loads). */
export const urls = {
  get admin() { return process.env.ADMIN_URL ?? ''; },
  get member() { return process.env.MEMBER_URL ?? ''; },
  get vendor() { return process.env.VENDOR_URL ?? ''; },
  /** Core API base for helpers that call the API from a signed-in page. Override with API_URL in .env. */
  get api() { return process.env.API_URL ?? 'https://api.pmp.herminahospital.com/api/v1'; },
};

/** Account for a role handle, e.g. account('admin-super'), from .env (QA_USER_<ROLE> / QA_PASS_<ROLE>). */
export function account(role: string): { username: string; password: string } {
  const key = role.toUpperCase().replace(/-/g, '_');
  return { username: process.env[`QA_USER_${key}`] ?? '', password: process.env[`QA_PASS_${key}`] ?? '' };
}
