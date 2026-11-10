// Member · Pengaturan › Profil Faskes and Dokumen (MREG-01), registration letter SRT-SP (MREG-06), Aktivasi with a used invitation link (MREG-05).
// The invitation link step is also the Background of the vendor MREG-05 feature (the link belongs to a member).
import { Given, When, Then, type DataTable } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { throwawayPassword } from '../../support/step-helpers';
import { data, account, urls } from '../../testdata';
import { memberGet, memberRequest, memberDownloadBase64 } from '../../utils/member-api';
import { pdfText } from '../../utils/pdf';
import { MemberDocumentsPage, MemberActivationPage } from '../../pages';
import { latestEmail, linkIn } from '../../utils/gmail';

const MEMBER_ACTIVATION_LINK = /^https:\/\/member-pmp\.herminahospital\.com\/activate\?token=/;

When('the member opens «Dokumen»', async function (this: RegressionWorld) {
  await new MemberDocumentsPage(this.f).open();
});
Then('these checklist items are shown:', async function (this: RegressionWorld, table: DataTable) {
  for (const item of table.raw().flat()) await expect(this.page.getByText(item, { exact: false }).first()).toBeVisible();
});
Then('none of the retired member document rules is shown', async function (this: RegressionWorld) {
  for (const rule of data.retiredMemberDocumentRules) await expect(this.page.getByText(rule, { exact: true })).toHaveCount(0);
});

// ---- MREG-05 (PMP-608): a used member invitation link is refused ----
Given('the used invitation link of the member-maker account', async function (this: RegressionWorld) {
  const { account: role, subject } = data.memberInvitation;
  this.stash.invitationLink = linkIn(await latestEmail(account(role).username, subject), MEMBER_ACTIVATION_LINK);
});
When('the link is submitted with a new password in the Member portal', async function (this: RegressionWorld) {
  this.stash.activation = await (await new MemberActivationPage(this.f).openLink(this.stash.invitationLink)).submitPassword(throwawayPassword());
});
When('the link with a changed token is submitted in the Member portal', async function (this: RegressionWorld) {
  // Same length and alphabet, last four characters changed: a well-formed token Core does not know.
  const link = new URL(this.stash.invitationLink);
  const token = link.searchParams.get('token')!;
  link.searchParams.set('token', token.slice(0, -4) + [...token.slice(-4)].map((c) => (c === 'A' ? 'B' : 'A')).join(''));
  this.stash.activation = await (await new MemberActivationPage(this.f).openLink(link.toString())).submitPassword(throwawayPassword());
});
Then('only «Masuk» is offered, without «Kirim ulang»', async function (this: RegressionWorld) {
  const page = new MemberActivationPage(this.f);
  await expect(page.signInAction).toBeVisible();
  await expect(page.resendAction).toHaveCount(0);
});

// ---- MREG-06 (PMP-793): a member registration issues Surat Pernyataan (SRT-SP) with «ID Dokumen» filled ----
const REGISTRATION = '/member/onboarding/registration';
Given('the member registration draft has its profile and a partner', async function (this: RegressionWorld) {
  // Arrange by API (idempotent): the behaviour under test is the letter Core generates, not the form.
  await this.f.app.open(`${urls.member}/register`);
  const profile = await memberRequest(this.f.browser, 'PATCH', REGISTRATION, data.memberRegistration.profile);
  expect(profile.status, `profile save (${JSON.stringify(profile.body?.data?.field_errors ?? profile.body?.message ?? '').slice(0, 200)})`).toBe(200);
  const partners = await memberRequest(this.f.browser, 'PUT', `${REGISTRATION}/partners`, { vendor_slugs: [data.memberRegistration.partnerVendorSlug] });
  expect(partners.status).toBe(200);
  const letters = await memberGet(this.f.browser, `${REGISTRATION}/letters`);
  const letter = (letters.body?.data ?? []).find((l: any) => l.template_code === data.memberRegistration.letterCode);
  expect(letter?.issuable, `precondition: ${data.memberRegistration.letterCode} is issuable once profile and partners are set`).toBe(true);
});
When('the Surat Pernyataan is issued', async function (this: RegressionWorld) {
  const issued = await memberRequest(this.f.browser, 'POST', `${REGISTRATION}/letters/${data.memberRegistration.letterCode}/generate`);
  this.stash.issueStatus = issued.status;
  this.stash.feeLetter = issued.body?.data;
  expect(this.stash.feeLetter?.download_path, `generate answered ${issued.status} ${JSON.stringify(issued.body?.message ?? issued.body?.error_code ?? '')}`).toBeTruthy();
  this.stash.letter = await pdfText(await memberDownloadBase64(this.f.browser, this.stash.feeLetter.download_path));
});
Then('the Surat Pernyataan is issued with its «ID Dokumen» filled', function (this: RegressionWorld) {
  const { documentIdLabel, unfilledMarker } = data.memberRegistration;
  expect([200, 201]).toContain(this.stash.issueStatus);
  expect(this.stash.letter.text).not.toContain(unfilledMarker);
  expect(this.stash.letter.text, `«${documentIdLabel}» followed by a value`).toMatch(new RegExp(`${documentIdLabel}\\s*:?\\s*[A-Z0-9][A-Z0-9-]{4,}`));
});
// Not an assertion: «two pages» comes from the Team Lead's retest note (PMP-793 comment 14405), who also asked HUB
// whether the fixed «Hal. x dari 2» footers should become page fields because longer content can add a page. Until
// HUB answers, the page count is reported, not judged.
Then('the page count is noted against the two pages the Team Lead expects', function (this: RegressionWorld) {
  const { expectedPages } = data.memberRegistration;
  const pages = this.stash.letter.pages;
  this.attach(`SRT-SP pages: ${pages} (Team Lead expects ${expectedPages}; open question to HUB in PMP-793 comment 14405).${pages === expectedPages ? '' : ' Different: check before calling it a bug.'}`, 'text/plain');
});
