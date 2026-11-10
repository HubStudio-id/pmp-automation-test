// Member · sign-in with «Ingat saya» and logout (AUTH-02).
import { Given, When } from '@cucumber/cucumber';
import type { RegressionWorld } from '../../support/world';
import { signInWith } from '../../support/step-helpers';
import { urls } from '../../testdata';
import { MemberShell } from '../../pages';

Given('the {string} member has signed in with «Ingat saya»', async function (this: RegressionWorld, role: string) {
  await signInWith(this, 'member', role, true);
});
When('the member signs out', async function (this: RegressionWorld) {
  await new MemberShell(this.f).signOut();
});
When('the Member cart page is opened', async function (this: RegressionWorld) { await this.f.app.open(`${urls.member}/cart`); });
