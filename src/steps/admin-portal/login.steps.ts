// Admin · sign-in, logout (AUTH-01) and lockout after five wrong passwords (AUTH-06).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { signInWith } from '../../support/step-helpers';
import { data, urls } from '../../testdata';
import { AdminShell, AdminDetailPage } from '../../pages';
import { adminLoginAttempt } from '../../utils/admin-api';

const HTTP_UNAUTHORIZED = 401;
const GENERIC_LOGIN_ERROR = 'Invalid email or password.';

Given('the {string} admin has signed in without «Ingat saya»', async function (this: RegressionWorld, role: string) {
  await signInWith(this, 'admin', role, false);
});
When('the admin signs out', async function (this: RegressionWorld) {
  await new AdminShell(this.f).signOut(data.admin.roleGgAdminDisplayName);
});
When('the Admin portal is opened again', async function (this: RegressionWorld) { await this.f.app.open(`${urls.admin}/`); });

When('five wrong passwords are sent for the lockable admin', async function (this: RegressionWorld) {
  await this.f.app.open(`${urls.admin}/`);
  const attempts = [];
  for (let i = 0; i < data.inputs.failedLoginsBeforeLock; i++) attempts.push(await adminLoginAttempt(this.f.browser, data.admin.lockableAdminEmail, data.vendor.wrongPassword));
  this.stash.attempts = attempts;
});
Then('every attempt is refused with the generic login error', function (this: RegressionWorld) {
  expect(this.stash.attempts.map((a: any) => a.status)).toEqual(Array(data.inputs.failedLoginsBeforeLock).fill(HTTP_UNAUTHORIZED));
  expect(this.stash.attempts.every((a: any) => a.message === GENERIC_LOGIN_ERROR)).toBe(true);
});
Then('the lockable admin shows an automatic lock', async function (this: RegressionWorld) {
  const detail = await new AdminDetailPage(this.f).open(data.admin.lockableAdminSlug);
  await detail.lockButton.or(detail.unlockButton).first().waitFor();
  await expect(detail.lockedNote).toBeVisible();
  await expect(detail.automaticLockNote).toBeVisible();
  this.stash.lockable = detail;
});
When('the Super Admin unlocks the lockable admin', async function (this: RegressionWorld) {
  await this.stash.lockable.unlockIfLocked(data.admin.lockableAdminSlug);
});
Then('the lockable admin is no longer locked', async function (this: RegressionWorld) {
  await expect(this.stash.lockable.lockButton).toBeVisible();
  await expect(this.stash.lockable.lockedNote).toHaveCount(0);
});
