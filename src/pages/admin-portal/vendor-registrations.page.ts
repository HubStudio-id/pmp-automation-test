import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export class VendorRegistrationsPage extends AdminShell {
  /** Opens the queue and waits until the tab counts and the table have loaded. */
  async open(): Promise<this> {
    await this.openUrl(`${urls.admin}/e-sourcing/registrations`);
    await this.screen.getByRole('tab', { name: /^Semua \d+$/ }).waitFor();
    return this.waitForTableLoaded();
  }
  get pageHeading() { return this.heading('Registrasi Vendor'); }
  get loadErrors() { return this.screen.getByText(/Akses Ditolak|tidak dapat dimuat|gagal dimuat/); }
  get rows() { return this.screen.getByRole('row'); }
  get firstRegistrationRow() { return this.rows.nth(1); }
  statusTab(name: string) { return this.screen.getByRole('tab', { name: new RegExp(`^${name} \\d+$`) }); }

  async openFirstRegistration(): Promise<this> {
    await this.firstRegistrationRow.getByRole('link').first().tap();
    await this.browser.waitForURL(/\/e-sourcing\/registrations\/.+/);
    return this;
  }
  /** Opens a registration's detail by slug and its «Dokumen» tab. */
  async openDocumentsOf(slug: string): Promise<this> {
    await this.openUrl(`${urls.admin}/e-sourcing/registrations/${slug}`);
    await this.screen.getByRole('tab', { name: /^Dokumen/ }).first().tap();
    await this.documentsCounter.waitFor();
    return this;
  }
  /** The counter line above the document table: «n wajib · n opsional menunggu verifikasi[ · n surat]». */
  get documentsCounter() { return this.screen.getByText(/\d+ wajib · \d+ opsional menunggu verifikasi/).first(); }
  async showStatus(name: string): Promise<this> { await this.statusTab(name).tap(); return this.waitForTableLoaded(); }
  // «Undang vendor» › Undangan Aktivasi
  get inviteDialog() { return this.screen.getByRole('dialog'); }

  async openActivationInvite(): Promise<this> {
    await this.screen.getByRole('button', { name: 'Undang vendor' }).tap();
    await this.screen.getByRole('radio', { name: 'Undangan Aktivasi' }).check();
    return this;
  }

  private async chooseInDialog(combobox: string, option: string): Promise<void> {
    await this.inviteDialog.getByRole('combobox', { name: combobox }).tap();
    await this.screen.getByText(option, { exact: true }).last().tap();
  }

  async fillActivationInvite(invite: { entityName: string; entityType: string; partnerCategory: string; productType: string; axCode: string; email: string; firstUserRole: string }): Promise<this> {
    await this.inviteDialog.getByRole('textbox', { name: 'Nama entitas (PT)' }).fill(invite.entityName);
    await this.chooseInDialog('Jenis Entitas', invite.entityType);
    await this.chooseInDialog('Kategori Rekanan', invite.partnerCategory);
    await this.chooseInDialog('Tipe Produk', invite.productType);
    await this.inviteDialog.getByRole('textbox', { name: 'Kode kreditur AX undangan' }).fill(invite.axCode);
    await this.inviteDialog.getByRole('textbox', { name: 'E-mail pengguna awal (maks. 10, pisahkan dengan koma)' }).fill(invite.email);
    await this.chooseInDialog('Peran pengguna pertama', invite.firstUserRole);
    return this;
  }
  get axMatchNote() { return this.inviteDialog.getByText('Kode cocok dengan master AX-HRM'); }

  /** Sends the invitation; returns the API status and the provisioned vendor slug. */
  async sendInvite(): Promise<{ status: number; vendorSlug: string }> {
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/admin\/vendor-invitations$/),
      this.inviteDialog.getByRole('button', { name: 'Kirim undangan' }).tap(),
    ]);
    const body = await response.json().catch(() => ({}));
    const payload = body as { data?: { vendor?: { slug?: string }; slug?: string } };
    return { status: response.status, vendorSlug: payload.data?.vendor?.slug ?? payload.data?.slug ?? '' };
  }

  get registrationDetailHeading() { return this.heading('Detail pendaftar'); }
}
