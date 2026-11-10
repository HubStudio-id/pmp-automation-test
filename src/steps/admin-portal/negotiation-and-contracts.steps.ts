// Admin · Master › Negosiasi (NEG-01, the vendor side reads the code first; NEG-03 attachment links) and Master › Kontrak (KTR-01).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { data, urls } from '../../testdata';
import { adminRequest, adminPathStatus } from '../../utils/admin-api';
import { AdminNegotiationPage, AdminContractsPage } from '../../pages';

When('that negotiation is opened in Admin Negosiasi', async function (this: RegressionWorld) {
  this.stash.adminNegotiation = await new AdminNegotiationPage(this.f).open(this.stash.negotiationCode);
});
Then('the Admin page shows the same code', async function (this: RegressionWorld) {
  await expect(this.stash.adminNegotiation.summaryLine(this.stash.negotiationCode)).toBeVisible();
  await expect(this.stash.adminNegotiation.accessDeniedMessage).toHaveCount(0);
});
Then('the Admin page names the vendor QA-DIST Distributor A', async function (this: RegressionWorld) {
  await expect(this.stash.adminNegotiation.heading(data.vendor.distributorAName)).toBeVisible();
});

// ---- KTR-01 (PMP-666 TC-1.1): an Aktif contract past its end date keeps «PKS Aktif», not «Berakhir» ----
// The «Masa berlaku telah berakhir» badge is not asserted: the TC expects it only after PMP-540 ships (In Development).
Given('an Aktif contract past its end date exists', async function (this: RegressionWorld) {
  await this.f.app.open(`${urls.admin}/`);
  const contracts = await adminRequest(this.f.browser, 'GET', '/admin/contracts?per_page=100');
  expect(contracts.status).toBe(200);
  const past = (contracts.body?.data ?? []).find((c: any) => c.status === 'active' && c.validity_state === 'past');
  expect(past, 'precondition: an Aktif contract whose end date has passed (validity_state past)').toBeDefined();
  this.stash.pastContract = { code: past.code, validUntil: past.valid_until };
});
When('the Admin contract register is searched for it', async function (this: RegressionWorld) {
  this.stash.contracts = await (await new AdminContractsPage(this.f).open()).search(this.stash.pastContract.code);
});
Then('its row keeps the stored status «PKS Aktif» and is not «Berakhir»', async function (this: RegressionWorld) {
  const row = this.stash.contracts.contractRow(this.stash.pastContract.code);
  await expect(row, `${this.stash.pastContract.code} ended ${this.stash.pastContract.validUntil}`).toContainText(data.contracts.storedActiveLabel);
  await expect(row).not.toContainText(data.contracts.endedLabel);
});

// ---- NEG-03 (PMP-732): attachment links need the session ----
const ATTACHMENT_PATH = /^\/api\/v1\/admin\/negotiations\/[^/]+\/messages\/\d+\/attachments\/\d+$/;
const REFUSED_WITHOUT_SESSION = [401, 403];

When('the attachments of the QA negotiation are listed', async function (this: RegressionWorld) {
  const code = data.negotiationAttachment.code;
  await this.f.app.open(`${urls.admin}/`);
  const messages = await adminRequest(this.f.browser, 'GET', `/admin/negotiations/${code}/messages?per_page=100`);
  expect(messages.status).toBe(200);
  const links = (JSON.stringify(messages.body).match(/"url":"[^"]+"/g) ?? []).map((m) => m.slice(7, -1)).filter((u) => /attachments/.test(u));
  expect(links.length, `precondition: ${code} has at least one message attachment`).toBeGreaterThan(0);
  this.stash.attachmentUrl = links[0];
});
Then('the attachment link is a portal API path, not a storage URL', function (this: RegressionWorld) {
  expect(this.stash.attachmentUrl).toMatch(ATTACHMENT_PATH);
});
Then('the attachment opens with the admin session', async function (this: RegressionWorld) {
  expect(await adminPathStatus(this.f.browser, this.stash.attachmentUrl, true)).toBe(200);
});
Then('the attachment is refused without a session', async function (this: RegressionWorld) {
  expect(REFUSED_WITHOUT_SESSION).toContain(await adminPathStatus(this.f.browser, this.stash.attachmentUrl, false));
});

// ---- NEG-01 (PMP-518 TC-450-07-006 and TC-450-07-010): no «Pembulatan» on the target card or in the payload ----
Then('its target card shows «Target diskon bagian» and no «Pembulatan»', async function (this: RegressionWorld) {
  const main = this.page.getByRole('main');
  await expect(main).toContainText(data.negotiation.targetCardLabel);
  await expect(main).not.toContainText(data.negotiation.retiredRoundingLabel);
});
Then('the negotiation payload has sections and no rounding value', async function (this: RegressionWorld) {
  const negotiation = await adminRequest(this.f.browser, 'GET', `/admin/negotiations/${this.stash.negotiationCode}`);
  expect(negotiation.status).toBe(200);
  expect((negotiation.body?.data?.sections ?? []).length, 'precondition: the negotiation has a section').toBeGreaterThan(0);
  expect(JSON.stringify(negotiation.body), 'TC-450-07-010: no rounding in the response').not.toMatch(/rounding/i);
});
