// Vendor · sign-in with «Ingat saya» and logout (AUTH-02) wrong sign-in (AUTH-04).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { signInWith } from '../../support/step-helpers';
import { data, urls } from '../../testdata';
import { LoginPage, VendorShell } from '../../pages';

const GENERIC_SIGN_IN_ALERT = /^(Email atau kata sandi salah\.|Login gagal)/;
const ACCOUNT_EXISTENCE_HINT = /tidak terdaftar|tidak ditemukan/i;

Given('the {string} vendor has signed in with «Ingat saya»', async function (this: RegressionWorld, role: string) {
  await signInWith(this, 'vendor', role, true);
});
When('the vendor signs out', async function (this: RegressionWorld) {
  await new VendorShell(this.f).signOut(data.vendor.bmhpAlkesAvatarInitials);
});
When('the Vendor dashboard is opened', async function (this: RegressionWorld) { await this.f.app.open(`${urls.vendor}/dashboard`); });

When('an unknown e-mail signs in to the Vendor portal with a wrong password', async function (this: RegressionWorld) {
  await new LoginPage(this.f, 'vendor').submitCredentials(data.vendor.unknownEmail, data.vendor.wrongPassword);
});
Then('a generic sign-in error is shown', async function (this: RegressionWorld) {
  await expect(this.page.getByRole('alert').filter({ hasText: GENERIC_SIGN_IN_ALERT }).first()).toBeVisible();
});
Then('no message says whether the e-mail exists', async function (this: RegressionWorld) {
  await expect(this.page.getByText(ACCOUNT_EXISTENCE_HINT)).toHaveCount(0);
});
