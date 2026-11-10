// Admin · Master › Member: «Undang faskes» dialog (MREG-03).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { data } from '../../testdata';
import { AdminMembersPage } from '../../pages';
import { adminRequest } from '../../utils/admin-api';

Given('the Admin member list is opened', async function (this: RegressionWorld) {
  this.stash.members = await new AdminMembersPage(this.f).open();
});

When('the «Undang faskes» dialog is opened', async function (this: RegressionWorld) {
  await this.stash.members.openInviteFacilityDialog();
});
Then('the dialog offers {string} and {string}', async function (this: RegressionWorld, a: string, b: string) {
  for (const type of [a, b]) await expect(this.stash.members.inviteDialog.getByText(type, { exact: false }).first()).toBeVisible();
});

// ---- MREG-03 (PMP-673 TC-1.6): the invitation states the working-day validity configured in Standar Operasional ----
Then('the dialog states the facility-invitation validity configured in Standar Operasional', async function (this: RegressionWorld) {
  const definitions = await adminRequest(this.f.browser, 'GET', '/admin/sla-definitions?per_page=100');
  const sla = (definitions.body?.data ?? []).find((d: any) => d.code === data.facilityInvite.slaCode);
  const days = sla?.current_version?.value;
  expect(Number.isInteger(days), `precondition: SLA ${data.facilityInvite.slaCode} has a current value`).toBe(true);
  await expect(this.page.getByRole('dialog').last()).toContainText(`${days} hari kerja`);
});
