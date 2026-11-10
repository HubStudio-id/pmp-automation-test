// Admin · Audit › Arsip and Log Aktivitas.
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { ArchivePage, ActivityLogPage } from '../../pages';
import { data } from '../../testdata';

const ARCHIVE_TABS = ['Kategori & Tipe Produk', 'Aturan dokumen', 'Peran', 'Admin', 'Entitas vendor/member', 'Produk'];
const ACCOUNT_AND_ROLE_TAB = 'Akun & peran';
const MISSING_CHANGE_VALUE = 'Tidak tersedia';
const MISSING_REASON_VALUE = '-';

When('the Arsip page is opened', async function (this: RegressionWorld) {
  this.stash.archive = await new ArchivePage(this.f).open();
  await expect(this.stash.archive.pageHeading).toBeVisible();
});
Then('every Arsip tab shows a count', async function (this: RegressionWorld) {
  for (const tab of ARCHIVE_TABS) await expect(this.stash.archive.tab(tab)).toBeVisible();
});
When('the Admin tab is shown', async function (this: RegressionWorld) {
  await this.stash.archive.showTab('Admin');
});
Then('a cancelled admin invitation offers no «Pulihkan»', async function (this: RegressionWorld) {
  const rows = this.stash.archive.cancelledInvitationRows;
  await expect(rows.first(), 'precondition: a cancelled admin invitation exists in Arsip › Admin').toBeVisible();
  await expect(rows.first().getByRole('button', { name: /^Pulihkan/ })).toHaveCount(0);
});

Given('Log Aktivitas is open on «Akun & peran»', async function (this: RegressionWorld) {
  this.stash.log = await (await new ActivityLogPage(this.f).open()).showTab(ACCOUNT_AND_ROLE_TAB);
});
When('the log is searched for {string}', async function (this: RegressionWorld, text: string) {
  await this.stash.log.search(text);
});
Then('the Super Admin transfer row shows its change and its reason', async function (this: RegressionWorld) {
  const row = this.stash.log.superAdminTransferRow;
  await expect(row, 'precondition: a Super Admin transfer is in the log').toBeVisible();
  await expect(row.getByText(MISSING_CHANGE_VALUE, { exact: true })).toHaveCount(0);
  await expect(row.getByText(MISSING_REASON_VALUE, { exact: true })).toHaveCount(0);
});
Then('the archived admin row offers «Pulihkan»', async function (this: RegressionWorld) {
  const row = this.stash.log.archivedAdminRow(data.admin.archivableAdminName);
  await expect(row, `precondition: the «Admin dinonaktifkan» row of ${data.admin.archivableAdminName} (archived by @archived-admin) is in the log`).toBeVisible();
  await expect(row.getByRole('button', { name: /Pulihkan/ })).toBeVisible();
});
