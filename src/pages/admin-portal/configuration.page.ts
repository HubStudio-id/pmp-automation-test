import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

/** Konfigurasi › Batas & Domain. Shared setting: tests only type and reload, never press «Simpan». */
export class LimitsConfigPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/configuration/limits`); }
  get pageHeading() { return this.heading('Konfigurasi › Batas & Domain'); }
  field(label: string) { return this.screen.getByLabel(label); }
  get announcementField() { return this.field('Pengumuman'); }
  get saveButtons() { return this.screen.getByRole('button', { name: 'Simpan', exact: true }); }
  async typeAnnouncement(text: string): Promise<this> { await this.announcementField.fill(text); return this; }
  async discardChangesByReloading(): Promise<this> { return this.open(); }
}

/** Konfigurasi › Standar Operasional. Read only in tests. */
export class OperationalStandardsPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/configuration/operational-standards`); }
  get pageHeading() { return this.heading('Konfigurasi › Standar Operasional'); }
  get saveChangesButton() { return this.screen.getByRole('button', { name: 'Simpan perubahan' }); }
  get lastStandardRow() { return this.screen.getByRole('combobox', { name: 'Eskalasi ke VENDOR_RETURN_RESPONSE' }); }
  get firstEscalationPicker() { return this.screen.getByRole('combobox', { name: /^Eskalasi ke / }).first(); }
  /** The open picker renders its entries outside the page's main region, so picker entries = all matches − matches in main. */
  async escalationPickerEntries(role: string): Promise<number> {
    const everywhere = await this.screen.getByText(role, { exact: true }).count();
    const inPage = await this.screen.getByRole('main').getByText(role, { exact: true }).count();
    return everywhere - inPage;
  }
  workingDaysField(code: string) { return this.screen.getByRole('spinbutton', { name: new RegExp(`^Hari kerja .*${code}`) }).first(); }

  /** Opens the first escalation picker and waits until its last entry («Admin MLM») has rendered. */
  async openFirstEscalationPicker(): Promise<this> {
    await this.lastStandardRow.waitFor();
    await this.firstEscalationPicker.tap();
    await this.screen.getByText('Procurement Manager', { exact: true }).last().waitFor();
    return this;
  }
  async closeEscalationPicker(): Promise<this> { await this.firstEscalationPicker.press('Escape'); return this; }
  async searchStandard(code: string): Promise<this> {
    await this.screen.getByRole('searchbox', { name: 'Cari kode atau tugas' }).fill(code);
    return this;
  }
}

/** Konfigurasi › Template Dokumen. Nothing is uploaded or archived: tests only read the offered actions. */
export class DocumentTemplatesPage extends AdminShell {
  async open(): Promise<this> {
    await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/admin\/document-templates(\?|$)/),
      this.openUrl(`${urls.admin}/configuration/document-templates`),
    ]);
    return this.waitForTableLoaded();
  }
  get pageHeading() { return this.heading('Template Dokumen'); }
  action(name: string) { return this.screen.getByRole('button', { name, exact: true }); }
  /** Opens a template's detail by its name (the «Lihat <name>» button). */
  async viewTemplate(name: string): Promise<this> {
    await this.screen.getByRole('button', { name: `Lihat ${name}`, exact: true }).tap();
    await this.heading('Riwayat versi').waitFor();
    return this;
  }
  /** The «Riwayat versi» table (the only table with a «Diunggah» column). */
  get versionHistory() { return this.screen.getByRole('table').filter({ has: this.screen.getByRole('columnheader', { name: 'Diunggah' }) }); }
  /** A row of the «Riwayat versi» table, found by its version cell. */
  versionRow(version: string) { return this.versionHistory.getByRole('row').filter({ has: this.screen.getByRole('cell', { name: version }) }).first(); }
  /** Opens the first template's detail (rendered inline below the table, with «Riwayat versi»). */
  async viewFirstTemplate(): Promise<this> {
    await this.screen.getByRole('button', { name: /^Lihat / }).first().tap();
    await this.heading('Riwayat versi').waitFor();
    return this;
  }

  // «Unggah versi baru» dialog (TPL-01 expects a refusal; nothing is stored when the check works)
  get uploadDialog() { return this.screen.getByRole('dialog').filter({ has: this.screen.getByRole('textbox', { name: 'Label versi' }) }); }
  /** Opens «Unggah versi baru» on the open template, fills it and presses «Unggah»; returns the upload response. */
  async uploadVersion(filePath: string, versionLabel: string, note: string): Promise<{ status: number; body: any }> {
    await this.action('Unggah versi baru').tap();
    await this.uploadDialog.waitFor();
    await this.uploadDialog.locator('input[type=file]').setInputFiles(filePath);
    await this.uploadDialog.getByRole('textbox', { name: 'Label versi' }).fill(versionLabel);
    await this.uploadDialog.getByRole('textbox', { name: 'Catatan' }).fill(note);
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/admin\/document-templates\/[^/]+\/versions$/),
      this.uploadDialog.getByRole('button', { name: 'Unggah', exact: true }).tap(),
    ]);
    return { status: response.status, body: await response.json().catch(() => null) };
  }
}
