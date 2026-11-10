// Admin · Manajemen Pengguna › Peran, Registrasi Vendor with a view-only role (ROLE-07), Template Dokumen for Admin Legal (ROLE-11) its version history (TPL-02) and upload check (TPL-01), Hak akses efektif, Batas & Domain, Edit Produk authority, Super Admin transfer and seat cap, Dasbor Utama.
import { Given, When, Then, type DataTable } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { data, urls } from '../../testdata';
import { adminRequest, adminDownloadBase64 } from '../../utils/admin-api';
import { freeVersionLabel, withFieldInBody } from '../../utils/docx';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AccountSettingsPage, RolesPage, AdminDashboardPage, LimitsConfigPage, AdminProductsPage, AdminDetailPage, DocumentTemplatesPage } from '../../pages';

When('the Admin account settings page is opened', async function (this: RegressionWorld) {
  this.stash.account = await new AccountSettingsPage(this.f).open();
});
Then('the sidebar group {string} is shown', async function (this: RegressionWorld, group: string) {
  await expect(this.page.getByText(group, { exact: true })).toBeVisible();
});

When('the role editor of the configured role is opened', async function (this: RegressionWorld) {
  this.stash.roleEditor = await new RolesPage(this.f).openEditor(data.admin.roleForEditorCheck);
});
Then('the role editor says the account page, Help Desk and Notifikasi are always on', async function (this: RegressionWorld) {
  await expect(this.stash.roleEditor.alwaysOnPagesNote).toBeVisible();
});
// «Contains», not exact: a retired right renders inside a longer label («Calon vendor · Belum tersedia»). The previous
// step has already asserted the editor's note is visible, so a zero count is not vacuous.
Then('the role editor never mentions {string}', async function (this: RegressionWorld, text: string) {
  await expect(this.page.getByText(text, { exact: false })).toHaveCount(0);
});

When('the Admin dashboard is opened', async function (this: RegressionWorld) {
  this.stash.dashboard = await new AdminDashboardPage(this.f).open();
});
Then('the dashboard block {string} is shown', async function (this: RegressionWorld, block: string) {
  await expect(this.stash.dashboard.block(block)).toBeVisible();
});
Then('these dashboard blocks are shown:', async function (this: RegressionWorld, table: DataTable) {
  for (const block of table.raw().flat()) await expect(this.stash.dashboard.block(block)).toBeVisible();
});
Then('the sidebar has no {string} link', async function (this: RegressionWorld, name: string) {
  await expect(this.page.getByRole('link', { name, exact: true })).toHaveCount(0);
});
Then('no {string} button is offered', async function (this: RegressionWorld, name: string) {
  await expect(this.page.getByText(name, { exact: true })).toHaveCount(0);
});

When('the Admin role page is opened', async function (this: RegressionWorld) {
  await new RolesPage(this.f).open();
});

Then('the «Hak akses efektif» card is shown', async function (this: RegressionWorld) {
  await expect(this.stash.account.effectiveAccessCard).toBeVisible();
  await expect(this.stash.account.productTypeAuthorityLabel).toBeVisible();
});
Then('every product type is listed with {string}', async function (this: RegressionWorld, rights: string) {
  for (const type of data.productTypes) {
    await expect(this.page.getByText(new RegExp(`${type} \\([A-Z-]+\\): ${rights}`)).first()).toBeVisible();
  }
});
Then('the role {string} is shown', async function (this: RegressionWorld, role: string) {
  await expect(this.page.getByText(role).first()).toBeVisible();
});
Then('the product-type authority reads {string}', async function (this: RegressionWorld, value: string) {
  await expect(this.stash.account.productTypeAuthorityLabel).toBeVisible();
  await expect(this.page.getByText(value, { exact: true }).first()).toBeVisible();
});

When('the «Batas & Domain» configuration page is opened', async function (this: RegressionWorld) {
  this.stash.limits = await new LimitsConfigPage(this.f).open();
  await expect(this.stash.limits.pageHeading).toBeVisible();
});
Then('these fields are disabled:', async function (this: RegressionWorld, table: DataTable) {
  for (const label of table.raw().flat()) await expect(this.stash.limits.field(label)).toBeDisabled();
});
Then('the field {string} is enabled', async function (this: RegressionWorld, label: string) {
  await expect(this.stash.limits.field(label)).toBeEnabled();
});
Then('exactly {int} «Simpan» button is offered', async function (this: RegressionWorld, count: number) {
  await expect(this.stash.limits.saveButtons).toHaveCount(count);
});

When('the admin searches Master › Produk for the QA product without type authority', async function (this: RegressionWorld) {
  this.stash.products = await (await new AdminProductsPage(this.f).open()).search(data.admin.productWithoutTypeAuthority);
});
Then('the product can be viewed', async function (this: RegressionWorld) {
  await expect(this.stash.products.viewDetailButton(data.admin.productWithoutTypeAuthority)).toBeVisible();
});
Then('«Edit Produk» is not offered for it', async function (this: RegressionWorld) {
  await expect(this.stash.products.editButton(data.admin.productWithoutTypeAuthority)).toHaveCount(0);
});

Given('the detail of the QA Super Admin is open', async function (this: RegressionWorld) {
  this.stash.adminDetail = await new AdminDetailPage(this.f).open(data.admin.superAdminSlug);
});
When('the «Alihkan Super Admin» dialog is opened', async function (this: RegressionWorld) {
  await this.stash.adminDetail.openTransferDialog();
});
When('a wrong confirmation e-mail and a {int}-character reason are typed', async function (this: RegressionWorld, length: number) {
  await this.stash.adminDetail.typeConfirmationEmail(data.admin.transferConfirmationWrongEmail);
  await this.stash.adminDetail.typeReason('x'.repeat(length));
});
// PMP-669 TC-2.1: a Super Admin's detail offers «Alihkan Super Admin» and no «Kunci Akun» / «Nonaktifkan & arsipkan».
// Positive anchor: the same locators find those actions on an ordinary admin, so the zero count below is real.
Given("an ordinary admin's detail offers «Kunci Akun»", async function (this: RegressionWorld) {
  const ordinary = await new AdminDetailPage(this.f).open(data.admin.lockableAdminSlug);
  await expect(ordinary.lockOrDeactivateButtons.first()).toBeVisible();
});
Then('it offers «Alihkan Super Admin» and no «Kunci Akun» or «Nonaktifkan & arsipkan»', async function (this: RegressionWorld) {
  await expect(this.stash.adminDetail.transferButton).toBeVisible();
  await expect(this.stash.adminDetail.lockOrDeactivateButtons).toHaveCount(0);
});
Then('«Konfirmasi» is disabled', async function (this: RegressionWorld) {
  await expect(this.stash.adminDetail.confirmTransferButton).toBeDisabled();
});
Then('the reason keeps at most {int} characters', async function (this: RegressionWorld, max: number) {
  expect((await this.stash.adminDetail.reasonField.inputValue()).length).toBeLessThanOrEqual(max);
});
Then('cancelling closes the dialog', async function (this: RegressionWorld) {
  await this.stash.adminDetail.cancelTransfer();
  await expect(this.stash.adminDetail.transferDialog).toHaveCount(0);
});

Given('the detail of the promotion target admin is open', async function (this: RegressionWorld) {
  this.stash.adminDetail = await new AdminDetailPage(this.f).open(data.admin.promotionTargetSlug);
});
// ---- ROLE-09 (PMP-669 TC-2.6): no extra Super Admin seat through «Edit Detail» ----
// Super Admin is an account status, not a role: the «Peran» list never offers it, and the seat only moves with
// «Alihkan Super Admin» (ROLE-08). Read-only: the edit is cancelled, nothing is saved.
When('the roles offered in «Edit Detail» are read', async function (this: RegressionWorld) {
  await this.stash.adminDetail.startEditing();
  this.stash.roleOptions = await this.stash.adminDetail.roleOptions();
  await this.stash.adminDetail.cancelEditing();
});
Then('the list holds the admin roles but not {string}', function (this: RegressionWorld, role: string) {
  expect(this.stash.roleOptions.length, 'precondition: the role list loaded').toBeGreaterThan(1);
  expect(this.stash.roleOptions).toContain(data.admin.promotionTargetRole);
  expect(this.stash.roleOptions).not.toContain(role);
});
Then('the admin keeps the original role', async function (this: RegressionWorld) {
  const detail = await new AdminDetailPage(this.f).open(data.admin.promotionTargetSlug);
  expect(await detail.currentRoleName()).toBe(data.admin.promotionTargetRole);
});

// ---- ROLE-07 (PMP-752): «Lihat» on Registrasi Vendor opens the queue ----
Given('Role GG, the role of this admin, holds Lihat only', async function (this: RegressionWorld) {
  // An admin without Peran cannot read /admin/roles (403); its own role comes from /account. That Role GG holds Lihat
  // only (Kelola on nothing) is what ROLE-02 checks on the same account.
  await this.f.app.open(`${urls.admin}/`);
  const account = await adminRequest(this.f.browser, 'GET', '/account');
  expect(account.status).toBe(200);
  const role = account.body?.data?.access_role;
  expect(role?.slug, `precondition: this admin has role ${data.roles.viewOnlyRoleSlug}`).toBe(data.roles.viewOnlyRoleSlug);
  expect(role?.full_access).toBe(false);
});
Then('the queue lists registrations', async function (this: RegressionWorld) {
  await expect(this.stash.registrations.firstRegistrationRow).toBeVisible();
});

// ---- ROLE-11 (PMP-726): Admin Legal manages Template Dokumen ----
When('Template Dokumen is opened', async function (this: RegressionWorld) {
  this.stash.templates = await new DocumentTemplatesPage(this.f).open();
  await expect(this.stash.templates.pageHeading).toBeVisible();
  await expect(this.stash.templates.accessDeniedMessage).toHaveCount(0);
});
Then('the template list offers «Unggah templat baru»', async function (this: RegressionWorld) {
  await expect(this.stash.templates.action(data.documentTemplates.listAction)).toBeVisible();
});
Then('a template offers «Unggah versi baru»', async function (this: RegressionWorld) {
  await this.stash.templates.viewFirstTemplate();
  await expect(this.stash.templates.action(data.documentTemplates.detailAction)).toBeVisible();
});

// ---- TPL-02 (PMP-725): «Riwayat versi» marks every replaced version «Diarsipkan» ----
When('the versioned QA template is viewed', async function (this: RegressionWorld) {
  const code = data.documentTemplates.versionedTemplate;
  const list = await adminRequest(this.f.browser, 'GET', '/admin/document-templates?per_page=100');
  const template = (list.body?.data ?? []).find((t: any) => t.code === code);
  expect(template, `precondition: template ${code} exists`).toBeDefined();
  const detail = await adminRequest(this.f.browser, 'GET', `/admin/document-templates/${template.slug}`);
  const versions: { version: string; status: string }[] = (detail.body?.data?.versions ?? [])
    .map((v: any) => ({ version: v.version ?? v.version_label, status: v.status }));
  expect(versions.filter((v) => v.status === 'archived').length, `precondition: ${code} has a replaced version`).toBeGreaterThan(0);
  this.stash.templateVersions = versions;
  await this.stash.templates.viewTemplate(template.name);
});
Then('the active version reads «Aktif» and every replaced version «Diarsipkan»', async function (this: RegressionWorld) {
  for (const v of this.stash.templateVersions as { version: string; status: string }[]) {
    const label = v.status === 'active' ? data.documentTemplates.activeStatus : data.documentTemplates.archivedStatus;
    await expect(this.stash.templates.versionRow(v.version), `version ${v.version} (${v.status})`).toContainText(label);
  }
});

// ---- TPL-01 (PMP-792): a template version that prints a field its letter never fills is refused ----
const DOCX_TMP = mkdtempSync(join(tmpdir(), 'qa-tpl01-'));
Given('the active file of the QA letter template is downloaded', async function (this: RegressionWorld) {
  const { templateCode, unfilledField, anchorField } = data.templateUploadCheck;
  await this.f.app.open(`${urls.admin}/`);
  const template = ((await adminRequest(this.f.browser, 'GET', '/admin/document-templates?per_page=100')).body?.data ?? []).find((t: any) => t.code === templateCode);
  expect(template, `precondition: template ${templateCode} exists`).toBeDefined();
  const versions = (await adminRequest(this.f.browser, 'GET', `/admin/document-templates/${template.slug}`)).body?.data?.versions ?? [];
  const active = versions.find((v: any) => v.status === 'active');
  expect(active, `precondition: ${templateCode} has an active version`).toBeDefined();
  const file = await adminDownloadBase64(this.f.browser, `/admin/document-templates/${template.slug}/versions/${active.slug}/download`);
  expect(file.status).toBe(200);
  this.stash.template = { slug: template.slug, name: template.name, activeLabel: active.version_label, originalBase64: file.base64 };
  this.stash.usedLabels = versions.map((v: any) => v.version_label);
  this.cleanup.templateToRestore = this.stash.template;
  const changed = join(DOCX_TMP, `${templateCode}-unfilled-field.docx`);
  // The field goes into the letter body next to «{{nib}}». Appended at the end of the file it lands on the field legend page,
  // which Core never scans or publishes, and the upload is then rightly accepted (TPL-01 was a false red until 10 Nov 2026).
  writeFileSync(changed, withFieldInBody(Buffer.from(file.base64, 'base64'), anchorField, unfilledField));
  this.stash.changedDocx = changed;
});
When('a new version that prints a field the letter never fills is uploaded', async function (this: RegressionWorld) {
  const templates = await new DocumentTemplatesPage(this.f).open();
  await templates.viewTemplate(this.stash.template.name);
  // A label no version of the template uses yet, in the format the dialog asks for (vYYYY.NN).
  const label = freeVersionLabel(this.stash.usedLabels);
  this.stash.upload = await templates.uploadVersion(this.stash.changedDocx, label, data.templateUploadCheck.note);
  this.stash.templates = templates;
});
Then("the upload is refused because the letter cannot render", async function (this: RegressionWorld) {
  const { errorCode, reason, message } = data.templateUploadCheck;
  expect(this.stash.upload.status, `upload status (body ${JSON.stringify(this.stash.upload.body).slice(0, 200)})`).toBe(422);
  expect(JSON.stringify(this.stash.upload.body)).toContain(errorCode);
  expect(JSON.stringify(this.stash.upload.body)).toContain(reason);
  await expect(this.stash.templates.uploadDialog.getByText(message)).toBeVisible();
});
Then('the active version of the template is unchanged', async function (this: RegressionWorld) {
  const versions = (await adminRequest(this.f.browser, 'GET', `/admin/document-templates/${this.stash.template.slug}`)).body?.data?.versions ?? [];
  expect(versions.find((v: any) => v.status === 'active')?.version_label).toBe(this.stash.template.activeLabel);
});
