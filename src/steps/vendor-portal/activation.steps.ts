// Vendor · Aktivasi: a member invitation link is refused (MREG-05) and an invited vendor activates and signs in
// (VREG-04, the admin side sends the invitation).
import { When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import { randomBytes } from 'node:crypto';
import type { RegressionWorld } from '../../support/world';
import { throwawayPassword } from '../../support/step-helpers';
import { urls } from '../../testdata';
import { VendorActivationPage, VendorDocumentDeadlineBanner, LoginPage } from '../../pages';
import { waitForEmail, linkIn } from '../../utils/gmail';

const ACTIVATION_LINK = /^https:\/\/vendor-pmp\.herminahospital\.com\/activate\?token=/;

When('the link is submitted with a new password in the Vendor portal', async function (this: RegressionWorld) {
  const token = new URL(this.stash.invitationLink).searchParams.get('token');
  const page = await new VendorActivationPage(this.f).openWithoutVendorSession(`${urls.vendor}/activate?token=${token}`);
  this.stash.activation = await page.submitPassword(throwawayPassword());
});

When('the activation link from the invitation e-mail is opened without a vendor session', async function (this: RegressionWorld) {
  const link = linkIn(await waitForEmail(this.stash.vendorEmail, this.stash.sentAt), ACTIVATION_LINK);
  this.stash.activation = await new VendorActivationPage(this.f).openWithoutVendorSession(link);
});
When('the vendor sets a new password and activates the account', async function (this: RegressionWorld) {
  this.stash.newPassword = `Qa-${randomBytes(12).toString('hex')}!`;
  this.stash.activationStatus = await this.stash.activation.activateWithPassword(this.stash.newPassword);
});
When('the vendor signs in with the new account', async function (this: RegressionWorld) {
  this.stash.newSignInStatus = await new LoginPage(this.f, 'vendor').signInAs({ username: this.stash.vendorEmail, password: this.stash.newPassword });
});
Then('the activation and the sign-in answered HTTP {int}', function (this: RegressionWorld, status: number) {
  expect([this.stash.activationStatus, this.stash.newSignInStatus]).toEqual([status, status]);
});
Then('the deadline reads {string}', async function (this: RegressionWorld, text: string) {
  await expect(new VendorDocumentDeadlineBanner(this.f).remainingDays(Number(text.match(/\d+/)?.[0]))).toBeVisible();
});
