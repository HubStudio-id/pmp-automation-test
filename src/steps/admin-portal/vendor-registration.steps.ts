// Admin · Master › Registrasi Vendor: queue and detail (VREG-02), «Undangan Aktivasi» invite (VREG-04, the vendor
// side activates), existing PKS fixture inspection (VREG-05).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { data, urls } from '../../testdata';
import { VendorRegistrationsPage } from '../../pages';
import { downloadPdfBase64 } from '../../utils/vendor-api';
import { adminRequest, findFreeAxCreditorCode } from '../../utils/admin-api';
import { pdfText } from '../../utils/pdf';

Given('the Registrasi Vendor queue is open', async function (this: RegressionWorld) {
  this.stash.registrations = await new VendorRegistrationsPage(this.f).open();
});
When('the first registration is opened', async function (this: RegressionWorld) {
  await this.stash.registrations.openFirstRegistration();
});
Then('no load error is shown on the registration pages', async function (this: RegressionWorld) {
  await expect(this.stash.registrations.loadErrors).toHaveCount(0);
});

Given('a free AX creditor code is found', async function (this: RegressionWorld) {
  await this.f.app.open(`${urls.admin}/`);
  this.stash.axCode = await findFreeAxCreditorCode(this.f.browser, data.vendorActivationInvite.axCodePrefixes);
});
When('a new QA distributor is invited with «Undangan Aktivasi»', async function (this: RegressionWorld) {
  const invite = data.vendorActivationInvite;
  const stamp = Date.now().toString().slice(-8);
  this.stash.vendorEmail = `${invite.emailPrefix}${stamp}@hubstudio.id`;
  const registrations = await (await new VendorRegistrationsPage(this.f).open()).openActivationInvite();
  await registrations.fillActivationInvite({ ...invite, entityName: `${invite.namePrefix} ${stamp}`, axCode: this.stash.axCode, email: this.stash.vendorEmail });
  this.stash.sentAt = new Date();
  const sent = await registrations.sendInvite();
  this.stash.inviteStatus = sent.status;
  this.cleanup.invitedVendorSlugs.push(sent.vendorSlug);
});
Then('the invitation was created with HTTP {int}', function (this: RegressionWorld, status: number) {
  expect(this.stash.inviteStatus).toBe(status);
});

When('the latest PKS draft for the QA contract is read', async function (this: RegressionWorld) {
  const { vendorSlug, contractSlug } = data.pksDraft;
  await this.f.app.open(`${urls.admin}/`);
  const versions = async () => ((await adminRequest(this.f.browser, 'GET', `/admin/vendors/${vendorSlug}/pks?per_page=100`)).body?.data ?? [])
    .filter((v: any) => v.contract_slug === contractSlug);
  const newestOf = (rows: any[]) => [...rows].sort((a: any, b: any) => b.version - a.version)[0];
  const existing = await versions();
  this.stash.draftStatus = existing.length ? 200 : 404;
  const newest = newestOf(existing);
  this.stash.versionAfter = newest?.version ?? 0;
  const lampiran3 = newest?.files?.find((file: any) => file.document === 'LAMP-3');
  this.stash.letter = await pdfText(await downloadPdfBase64(this.f.browser, lampiran3.url));
  const agreement = newest?.files?.find((file: any) => file.document === 'PKS-KOMP');
  this.stash.agreement = await pdfText(await downloadPdfBase64(this.f.browser, agreement.url));
});
Then('the latest PKS version is available', function (this: RegressionWorld) {
  expect(this.stash.draftStatus).toBe(200);
  expect(this.stash.versionAfter).toBeGreaterThan(0);
});
Then("its PKS-KOMP is headed by the agreement title, then the body title of the contract's product type", function (this: RegressionWorld) {
  // PMP-675: the heading prints the Legal agreement title of the body (BMHP here), not a generic one.
  const text = this.stash.agreement.text.replace(/\s+/g, ' ');
  expect(text).toContain(`${data.pksDraft.agreementTitle} ${data.pksDraft.bodyTitle}`);
});

// ---- VREG-02 (PMP-515 TC-450-04-015): the «Dokumen» counter shows what waits for verification ----
Given('a registration in «Verifikasi Legalitas» with files waiting for verification', async function (this: RegressionWorld) {
  const { letterDocumentTypes, waitingStatus } = data.legalCounter;
  await this.f.app.open(`${urls.admin}/`);
  const list = await adminRequest(this.f.browser, 'GET', '/admin/vendor-registrations?onboarding_stage=legal_verification&per_page=50');
  expect(list.status).toBe(200);
  for (const registration of list.body?.data ?? []) {
    const detail = await adminRequest(this.f.browser, 'GET', `/admin/vendor-registrations/${registration.slug}`);
    const waiting = (detail.body?.data?.document_categories ?? []).flatMap((c: any) => c.documents ?? [])
      .filter((doc: any) => doc.submission?.review_status === waitingStatus);
    if (!waiting.length) continue;
    const letters = waiting.filter((doc: any) => letterDocumentTypes.includes(doc.document_type)).length;
    const required = waiting.filter((doc: any) => doc.is_required && !letterDocumentTypes.includes(doc.document_type)).length;
    const optional = waiting.filter((doc: any) => !doc.is_required && !letterDocumentTypes.includes(doc.document_type)).length;
    this.stash.legalCounts = { slug: registration.slug, required, optional, letters };
    return;
  }
  expect(this.stash.legalCounts, 'precondition: a registration in «Verifikasi Legalitas» has files «Menunggu verifikasi»').toBeDefined();
});
When('its «Dokumen» tab is opened', async function (this: RegressionWorld) {
  this.stash.registrations = await new VendorRegistrationsPage(this.f).openDocumentsOf(this.stash.legalCounts.slug);
});
Then('the counter reads the waiting wajib, opsional and surat counts from the API', async function (this: RegressionWorld) {
  const { required, optional, letters } = this.stash.legalCounts;
  const expected = `${required} wajib · ${optional} opsional menunggu verifikasi${letters ? ` · ${letters} surat` : ''}`;
  await expect(this.stash.registrations.documentsCounter).toHaveText(new RegExp(`^${expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.?$`));
});
