// Vendor · Registrasi: wizard Tahap 1–7 and SRT-KJM (VREG-01), Pengajuan Berkas on a verified package (VREG-03).
// The letter marker check is in common.steps.ts (shared with the admin PKS draft).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { data } from '../../testdata';
import { RegistrationWizardPage, VendorDocumentsPage } from '../../pages';
import { vendorGet, downloadPdfBase64 } from '../../utils/vendor-api';
import { pdfText } from '../../utils/pdf';

const CONSENT_TYPES = ['fee_policy', 'nda', 'data_validity', 'portal_use'];

function wizard(world: RegressionWorld): RegistrationWizardPage { return world.stash.wizard; }
/** The draft's data profile: VREG-01's distributor draft by default, VREG-06 switches to the Sole distributor draft. */
function profile(world: RegressionWorld): any { return world.stash.wizardData ?? data.vendorWizard; }
function saved(world: RegressionWorld, status: number) { (world.stash.saved ??= []).push(status); }

Given('the registration wizard is open at step 1', async function (this: RegressionWorld) {
  this.stash.wizard = await new RegistrationWizardPage(this.f).open();
  await wizard(this).goToStep('Entitas & Perusahaan');
});
When('the company step is filled and saved', async function (this: RegressionWorld) {
  const v = profile(this); const w = wizard(this);
  // A draft invited by Admin «Undangan Mendaftar» arrives with these set by the invitation (profile keeps them null).
  if (v.entityType) await w.choose('Jenis Entitas', v.entityType);
  if (v.partnerCategory) await w.choose('Kategori Rekanan', v.partnerCategory);
  if (v.productType) await w.chooseOnce('Tipe Produk · boleh lebih dari satu', v.productType);
  // Sole distributor and principal drafts also ask «Status penanaman modal» and NIB (VREG-06).
  if (v.investmentStatus) await w.pickInGroup('investment_status', v.investmentStatus);
  if (v.typeNib) await w.type('NIB', v.nib);
  await w.type('NPWP', v.npwp);
  await w.pick('Status PKP', v.taxStatus);
  await w.type('Nomor SPPKP', v.sppkp);
  await w.pick('Cakupan Rekanan', v.scope);
  await w.addTags('KBLI yang dikerjasamakan dengan Hermina', [v.kbli]);
  await w.type('Alamat perusahaan', v.address);
  await w.type('Kode pos', v.postalCode);
  await w.type('Nomor Telepon', v.phone);
  await w.type('Kota domisili', v.city);
  saved(this, await w.continueToNextStep());
});
When('the legal step is filled and saved', async function (this: RegressionWorld) {
  const d = profile(this).deed; const w = wizard(this);
  await w.choose('Jenis akta', d.type);
  await w.type('Nomor akta', d.number);
  await w.date('Tanggal akta', d.date);
  await w.type('Nama notaris', d.notaryName);
  await w.type('Kota notaris', d.notaryCity);
  await w.type('Nomor surat Kemenkumham', d.kemenkumhamLetter);
  await w.type('Nomor SK pengesahan', d.skNumber);
  await w.date('Tanggal SK', d.skDate);
  saved(this, await w.continueToNextStep());
});
When('the responsible-person step is filled and saved', async function (this: RegressionWorld) {
  const r = profile(this).responsible; const w = wizard(this);
  await this.page.getByRole('radio', { name: new RegExp(`^${r.signer}`) }).check();
  await w.type('Nama lengkap direktur', r.directorName);
  await w.type('NIK direktur', r.directorNik);
  await w.type('E-mail direktur', r.directorEmail);
  await w.type('Nomor hubung Direktur', r.directorPhone);
  await w.type('Nama', r.contactName);
  await w.type('Jabatan', r.contactPosition);
  await w.type('E-mail', r.contactEmail);
  await w.type('Nomor hubung', r.contactPhone);
  saved(this, await w.continueToNextStep());
});
When('the bank step is filled and saved', async function (this: RegressionWorld) {
  const b = profile(this).bank; const w = wizard(this);
  await w.type('Nama bank', b.name);
  await w.type('Cabang bank', b.branch);
  await w.type('Nomor rekening', b.accountNumber);
  await w.type('Atas nama rekening', b.accountHolder);
  saved(this, await w.continueToNextStep());
});
When('every incomplete required document is uploaded and the documents step is saved', async function (this: RegressionWorld) {
  const v = profile(this); const w = wizard(this);
  await w.pick('Apakah perusahaan Anda pemegang izin edar?', v.marketingAuthorizationHolder);
  const incomplete = await w.incompleteRequiredDocuments();
  // @wizard-baseline removed this file, so the upload path runs on every run, not only on the first one.
  expect(incomplete.map((d) => d.name), `precondition: «${v.baselineDocument.name}» is incomplete before the upload (@wizard-baseline)`).toContain(v.baselineDocument.name);
  this.stash.uploads = [];
  for (const document of incomplete) {
    const status = await w.uploadDocument(document.name, v.dummyDocument, {
      number: document.numberRequired ? v.documentNumberPrefix : undefined,
      validUntil: document.validityRequired ? v.documentValidUntil : undefined,
    });
    this.stash.uploads.push({ name: document.name, status });
  }
  this.stash.incomplete = await w.incompleteRequiredDocuments();
  await this.page.getByRole('checkbox', { name: 'Saya telah meninjau persyaratan dan dokumen wajib' }).check();
  saved(this, await w.continueToNextStep());
});
When('the missing consents are given and the consent step is saved', async function (this: RegressionWorld) {
  const w = wizard(this);
  await w.fillSignerPhoneIfEmpty(profile(this).responsible.directorPhone);
  await w.confirmSignerAuthority();
  this.stash.consentStatuses = await w.giveMissingConsents();
  this.stash.consentTypes = await w.givenConsentTypes();
  saved(this, await w.continueToNextStep());
});
When('the review is saved', async function (this: RegressionWorld) {
  saved(this, await wizard(this).saveReview());
  this.stash.reachedStep = await wizard(this).stepLabel.textContent();
});
When('SRT-KJM is issued from the template block', async function (this: RegressionWorld) {
  await wizard(this).goToStep('Dokumen');
  this.stash.issueStatus = await wizard(this).issueLetter('SRT-KJM');
  const letters = await vendorGet(this.f.browser, '/vendor/registration-draft/letters');
  this.stash.feeLetter = letters.body?.data?.find((letter: any) => letter.template_code === 'SRT-KJM');
  this.stash.letter = await pdfText(await downloadPdfBase64(this.f.browser, this.stash.feeLetter.download_path));
});
Then('every step was saved with HTTP {int}', function (this: RegressionWorld, status: number) {
  expect(this.stash.saved).toEqual(Array(7).fill(status));
  expect(this.stash.consentStatuses.every((s: number) => [200, 201].includes(s))).toBe(true);
  expect(this.stash.consentTypes).toEqual(expect.arrayContaining(CONSENT_TYPES));
});
Then('no required document is incomplete', function (this: RegressionWorld) {
  expect(this.stash.incomplete).toEqual([]);
});
Then('the baseline document was uploaded in this run', function (this: RegressionWorld) {
  const upload = this.stash.uploads.find((u: { name: string }) => u.name === profile(this).baselineDocument.name);
  expect(upload, `«${profile(this).baselineDocument.name}» was uploaded by the documents step`).toBeDefined();
  expect([200, 201]).toContain(upload.status);
});
Then('the review step is reached', function (this: RegressionWorld) {
  expect(this.stash.reachedStep).toBe('Tahap 7 dari 7 · Review & Kirim');
});
Then('SRT-KJM is issued on one page with the company name', function (this: RegressionWorld) {
  expect([200, 201]).toContain(this.stash.issueStatus);
  expect(this.stash.feeLetter?.status).toBe('issued');
  expect(this.stash.letter.pages).toBe(1);
  expect(this.stash.letter.text).toContain(profile(this).companyName);
});

When('the vendor opens «Pengajuan Berkas»', async function (this: RegressionWorld) {
  this.stash.documents = await new VendorDocumentsPage(this.f).open();
  await expect(this.stash.documents.pageHeading).toBeVisible();
});
Then('«Ajukan Berkas» is disabled', async function (this: RegressionWorld) {
  await expect(this.stash.documents.submitPackageButton).toBeDisabled();
});
Then('the document statuses {string} and {string} are shown', async function (this: RegressionWorld, a: string, b: string) {
  for (const status of [a, b]) await expect(this.stash.documents.statusChip(status)).toBeVisible();
});

// ---- VREG-06 (PMP-753): the Sole distributor · Obat · PMDN draft issues SRT-KJM (it once failed with 422) ----
Given('the Sole distributor registration draft is used', function (this: RegressionWorld) {
  this.stash.wizardData = { ...data.vendorWizard, ...data.soleWizard };
});
