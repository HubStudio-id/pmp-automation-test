// Vendor registration wizard (7 «Tahap»). Fills a QA draft; never presses «Kirim pendaftaran».
import { urls } from '../../testdata';
import { ANT, BasePage } from '../base.page';
import { vendorGet } from '../../utils/vendor-api';

type RequiredDocument = { name: string; numberRequired: boolean; validityRequired: boolean };

export class RegistrationWizardPage extends BasePage {
  async open(): Promise<this> { return this.openUrl(`${urls.vendor}/dashboard`); }

  get stepLabel() { return this.screen.getByText(/^Tahap \d dari 7 · /); }
  stepButton(name: string) { return this.screen.getByRole('navigation', { name: 'Tahap pendaftaran' }).getByRole('button', { name: new RegExp(`^${name}`) }); }
  field(label: string) { return this.screen.getByRole('textbox', { name: label, exact: true }); }

  /** The wizard resumes at the last saved step; tests always start from a named step. */
  async goToStep(name: string): Promise<this> { await this.stepButton(name).tap(); return this; }

  async type(label: string, value: string): Promise<this> { await this.field(label).fill(value); return this; }

  /**
   * A radio group whose <label for> points at the group div, so it has no accessible name (e.g. «Status penanaman
   * modal», id investment_status): found by its field id instead.
   */
  async pickInGroup(fieldId: string, option: string): Promise<this> {
    await this.browser.locator(`[role="radiogroup"][id="${fieldId}"]`).getByRole('radio', { name: option }).check();
    return this;
  }

  async pick(radiogroup: string, option: string): Promise<this> {
    await this.screen.getByRole('radiogroup', { name: radiogroup }).getByRole('radio', { name: option }).check();
    return this;
  }

  /** Single select. */
  async choose(comboboxLabel: string, option: string): Promise<this> {
    await this.screen.getByRole('combobox', { name: comboboxLabel }).tap();
    await this.screen.getByText(option, { exact: true }).last().tap();
    return this;
  }

  /**
   * Multi-select: selects the option only when it is not selected yet (clicking a selected option clears it, so a
   * re-run must not click it again), then closes the list. The open list has no accessible scope: CSS locators.
   */
  async chooseOnce(comboboxLabel: string, option: string): Promise<this> {
    const box = this.screen.getByRole('combobox', { name: comboboxLabel });
    await box.tap();
    const openList = ANT.openDropdown;
    const item = (state: string) => `${openList} ${ANT.selectOption}${state}[name="${option}"], ${openList} ${ANT.selectOption}${state}[title="${option}"]`;
    await this.browser.locator(item('')).first().waitFor();
    if (!(await this.browser.locator(item('-selected')).count())) await this.browser.locator(item('')).first().tap();
    await box.press('Escape');
    return this;
  }

  /** Tag input (KBLI): types each missing value and confirms with Enter (typing an existing tag removes it). */
  async addTags(comboboxLabel: string, values: string[]): Promise<this> {
    const box = this.screen.getByRole('combobox', { name: comboboxLabel });
    for (const value of values) {
      if (await this.browser.locator(`${ANT.filledSelect} [title="${value}"]`).count()) continue;
      await box.tap();
      await box.pressSequentially(value);
      await box.press('Enter');
    }
    return this;
  }

  /** Date picker: types the date (YYYY-MM-DD) and confirms with Enter. */
  async date(label: string, isoDate: string): Promise<this> {
    const box = this.field(label);
    await box.tap();
    await box.fill(isoDate);
    await box.press('Enter');
    return this;
  }

  /** Presses the «Lanjut ke …» button and waits for the draft PATCH. */
  async continueToNextStep(): Promise<number> {
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/vendor\/registration-draft$/),
      this.screen.getByRole('button', { name: /^Lanjut ke / }).tap(),
    ]);
    return response.status;
  }

  // Tahap 6 · Persetujuan
  get consentDialog() { return this.screen.getByRole('dialog'); }

  /** The consent giver's phone (Tahap 6): carried from Tahap 3 when set there; the consents stay locked while it is empty. */
  async fillSignerPhoneIfEmpty(phone: string): Promise<this> {
    const field = this.screen.getByRole('textbox', { name: 'Nomor hubung' }).first();
    if (!(await field.inputValue())) await field.fill(phone);
    return this;
  }

  async confirmSignerAuthority(): Promise<this> {
    await this.screen.getByRole('checkbox', { name: /^Saya berwenang mewakili/ }).check();
    return this;
  }

  /**
   * Opens the consent at `index` («Baca»), scrolls its text to the end (the agreement box unlocks only then),
   * ticks it and presses «Setujui»; returns the save status.
   */
  async giveConsent(index: number): Promise<number> {
    await this.screen.getByRole('button', { name: 'Baca' }).nth(index).tap();
    await this.consentDialog.waitFor();
    await this.browser.evaluate(() => {
      const text = document.querySelector('[role="dialog"] [role="region"][aria-label^="Teks persetujuan"]');
      if (text) text.scrollTop = text.scrollHeight;
      return null;
    });
    await this.consentDialog.getByRole('checkbox', { name: /^Saya telah membaca dan menyetujui/ }).check();
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/vendor\/registration-draft\/consents/),
      this.consentDialog.getByRole('button', { name: 'Setujui' }).tap(),
    ]);
    await this.consentDialog.waitFor({ state: 'hidden' });
    return response.status;
  }

  get consentButtons() { return this.screen.getByRole('button', { name: 'Baca' }); }

  /** Consent types already recorded on the draft (fee_policy, nda, data_validity, portal_use). */
  async givenConsentTypes(): Promise<string[]> {
    const draft = await vendorGet(this.browser, '/vendor/registration-draft');
    return (draft.body?.data?.consents ?? []).map((consent: any) => consent.consent_type);
  }

  /** Gives every consent the draft does not have yet; the rows follow CONSENT_ORDER. Returns the save statuses. */
  async giveMissingConsents(): Promise<number[]> {
    const CONSENT_ORDER = ['fee_policy', 'nda', 'data_validity', 'portal_use'];
    const given = await this.givenConsentTypes();
    const statuses: number[] = [];
    for (let i = 0; i < CONSENT_ORDER.length; i++) {
      if (!given.includes(CONSENT_ORDER[i])) statuses.push(await this.giveConsent(i));
    }
    return statuses;
  }

  // Tahap 7 · Review & Kirim («Kirim pendaftaran» is never pressed)
  get letterDownloadButtons() { return this.screen.getByRole('button', { name: 'Unduh (terisi otomatis)' }); }

  /** Issues one registration letter from the «Templat surat» block of Tahap 5 (buttons follow GET …/letters order). */
  async issueLetter(templateCode: string): Promise<number> {
    const letters = await vendorGet(this.browser, '/vendor/registration-draft/letters');
    const index = (letters.body?.data ?? []).findIndex((letter: any) => letter.template_code === templateCode);
    const button = this.letterDownloadButtons.nth(index);
    await button.waitFor();
    const [response] = await Promise.all([
      this.browser.waitForResponse(new RegExp(`/registration-draft/letters/${templateCode}/generate`)),
      button.tap(),
    ]);
    return response.status;
  }

  async saveReview(): Promise<number> {
    await this.screen.getByRole('checkbox', { name: 'Saya telah memeriksa seluruh data pendaftaran' }).check();
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/vendor\/registration-draft/),
      this.screen.getByRole('button', { name: 'Simpan review' }).tap(),
    ]);
    return response.status;
  }

  /** Required documents that still miss a file or the number/validity their row asks for (registration-draft API). */
  async incompleteRequiredDocuments(): Promise<RequiredDocument[]> {
    const response = await vendorGet(this.browser, '/vendor/registration-draft/required-documents');
    return (response.body?.data?.document_categories ?? [])
      .flatMap((category: any) => category.documents ?? [])
      .filter((document: any) => document.requirement === 'required')
      .filter((document: any) => document.status === 'missing'
        || (document.number_required && !document.submission?.document_number)
        || (document.validity_required && !document.submission?.valid_until))
      .map((document: any) => ({ name: document.document_name, numberRequired: Boolean(document.number_required), validityRequired: Boolean(document.validity_required) }));
  }

  /**
   * Uploads `file` to one document row. «Nomor dokumen» / «Berlaku sampai» are sent together with the file, so they
   * are typed first; a row that already has a file gets it replaced, which re-sends the metadata too.
   */
  async uploadDocument(documentName: string, file: string, metadata: { number?: string; validUntil?: string } = {}): Promise<number> {
    const region = this.screen.getByRole('region', { name: `Detail ${documentName}` });
    if (!(await region.count())) await this.screen.getByRole('button', { name: `Lengkapi ${documentName}`, exact: true }).tap();
    await region.waitFor();
    // Some rows render the two metadata inputs without accessible names: fall back to their order in the row.
    const metadataField = async (label: string, index: number) => {
      const named = region.getByRole('textbox', { name: label });
      return (await named.count()) ? named : region.getByRole('textbox').nth(index);
    };
    if (metadata.number) await (await metadataField('Nomor dokumen', 0)).fill(metadata.number);
    if (metadata.validUntil) {
      const validUntil = await metadataField('Berlaku sampai', 1);
      await validUntil.fill(metadata.validUntil);
      await validUntil.press('Enter');
    }
    const input = this.browser.locator(`[aria-label="Detail ${documentName}"] input[type=file]`).first();
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/registration-draft\/required-documents\/[^/]+\/files/),
      input.setInputFiles(file),
    ]);
    return response.status;
  }
}
