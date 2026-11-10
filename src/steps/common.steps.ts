// Steps that are not tied to one portal: generic texts, headings, access, sign-in page, activation refusal,
// generated-letter markers. Portal steps live in admin-portal/, vendor-portal/, member-portal/.
import { Given, Then } from '@cucumber/cucumber';
import { expect } from '../support/bdd-expect';
import type { RegressionWorld } from '../support/world';
import { LoginPage, BasePage } from '../pages';
import { readSessionTokens, meStatus, refreshWith, type Portal } from '../utils/auth-api';

class AnyPage extends BasePage {}

const STAMP_PLACEHOLDER = /Baris stempel verifikasi/i;

Then('the text {string} is shown', async function (this: RegressionWorld, text: string) {
  await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible();
});

Then('the heading {string} is shown', async function (this: RegressionWorld, name: string) {
  await expect(new AnyPage(this.f).heading(name).first()).toBeVisible();
});

Then('the page heading {string} is shown', async function (this: RegressionWorld, name: string) {
  await expect(new AnyPage(this.f).heading(name).first()).toBeVisible();
});

Then('the notice {string} is shown', async function (this: RegressionWorld, text: string) {
  await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible();
});

Then('the label {string} is shown', async function (this: RegressionWorld, label: string) {
  await expect(this.page.getByText(new RegExp(`^${label}`)).first()).toBeVisible();
});

Then('the message {string} is shown', async function (this: RegressionWorld, text: string) {
  await expect(this.page.getByText(text, { exact: true })).toBeVisible();
});

Then('access is denied', async function (this: RegressionWorld) {
  await expect(new AnyPage(this.f).accessDeniedMessage).toBeVisible();
});

// ---- Sign-in page of any portal (AUTH-01, AUTH-02, AUTH-04) ----
Then(/^the (Admin|Member|Vendor) sign-in page is (?:still )?shown$/, async function (this: RegressionWorld, portal: string) {
  await expect(this.page).toHaveURL(/\/login/);
  await expect(new LoginPage(this.f, portal.toLowerCase() as any).submitButton).toBeVisible();
});

// ---- Activation refused in any portal (MREG-05) ----
Then('the activation is refused with {string}', function (this: RegressionWorld, errorCode: string) {
  expect(this.stash.activation).toEqual({ status: 422, errorCode });
});

// ---- Generated letters (vendor SRT-KJM in VREG-01, admin PKS Lampiran 3 in VREG-05) ----
Then(/^(SRT-KJM|the letter|its Lampiran 3) has no "([^"]+)" marker and no stamp placeholder$/, function (this: RegressionWorld, _subject: string, marker: string) {
  const text: string = this.stash.letter.text;
  expect(text).not.toContain(marker);
  expect(text).not.toMatch(STAMP_PLACEHOLDER);
});


// ---- PMP-484 (AUTH-01, AUTH-02): «Keluar» ends the server session, not only the local one ----
const REVOKED_SESSION = 401;
Given(/^the (admin|member|vendor) session tokens are noted$/, async function (this: RegressionWorld, portal: Portal) {
  const tokens = await readSessionTokens(this.f.browser, portal);
  expect(tokens.access, 'precondition: the portal stored an access token at sign-in').toBeTruthy();
  // Positive anchor: the same token answers 200 before «Keluar», so a later 401 comes from the logout, not a wrong endpoint.
  expect(await meStatus(this.f.browser, portal, tokens), 'the access token before «Keluar»').toBe(200);
  this.stash.sessionTokens = { portal, ...tokens };
});
Then('the old access token is refused with 401', async function (this: RegressionWorld) {
  const { portal, ...tokens } = this.stash.sessionTokens;
  expect(await meStatus(this.f.browser, portal, tokens), 'the pre-logout access token after «Keluar»').toBe(REVOKED_SESSION);
});
Then('the remember token can no longer refresh the session', async function (this: RegressionWorld) {
  const { portal, remember } = this.stash.sessionTokens;
  expect(remember, 'precondition: «Ingat saya» stored a remember token').toBeTruthy();
  const refresh = await refreshWith(this.f.browser, portal, remember);
  expect(refresh.newToken, `refresh with the pre-logout remember token answered ${refresh.status}`).toBe(false);
  expect(refresh.status).not.toBe(200);
});
