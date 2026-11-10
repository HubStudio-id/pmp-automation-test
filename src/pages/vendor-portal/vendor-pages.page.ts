import { urls } from '../../testdata';
import { VendorShell } from './vendor-shell.page';

export class VendorDashboardPage extends VendorShell {
  async open(): Promise<this> { return this.openUrl(`${urls.vendor}/dashboard`); }
  async goToMyNegotiations(): Promise<VendorNegotiationsPage> {
    await this.openSidebarItem('KATALOG', 'Negosiasi Saya');
    return new VendorNegotiationsPage(this.f);
  }
  async goToMyContracts(): Promise<VendorContractsPage> {
    await this.openSidebarItem('REGISTRASI', 'Kontrak Vendor');
    return new VendorContractsPage(this.f);
  }
}

export class VendorNegotiationsPage extends VendorShell {
  get negotiationCodes() { return this.screen.getByText(/NEG-\d{4}-\d{4}/); }

  /**
   * Waits until the negotiation table has finished loading (a loose «Belum ada|Tidak ada» text matched before the
   * rows arrived and gave a false «no negotiation»), then returns the codes shown.
   */
  async codes(): Promise<string[]> {
    await this.waitForTableLoaded();
    return (await this.negotiationCodes.allTextContents())
      .map((t: string) => t.match(/NEG-\d{4}-\d{4}/)?.[0])
      .filter((code: string | undefined): code is string => Boolean(code));
  }
}

export class VendorContractsPage extends VendorShell {
  get firstContractCode() { return this.screen.getByText(/KTR-\d{5}/).first(); }
  get srtLoaMentions() { return this.screen.getByText(/SRT-LOA/); }
}

export class VendorDocumentsPage extends VendorShell {
  async open(): Promise<this> {
    await this.openUrl(`${urls.vendor}/documents`);
    const retryButton = this.screen.getByRole('button', { name: 'Coba lagi', exact: true });
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await this.pageHeading.count()) {
        await this.pageHeading.waitFor({ timeout: 5_000 });
        return this;
      }
      if (!(await retryButton.count())) break;
      await retryButton.tap();
      await this.screen.getByRole('heading', { name: 'Pengajuan Berkas', exact: true }).waitFor({ timeout: 10_000 }).catch(() => undefined);
    }
    return this;
  }
  get pageHeading() { return this.heading('Pengajuan Berkas'); }
  get submittedNotice() { return this.screen.getByText(/Berkas telah diajukan/).first(); }
  get submitPackageButton() { return this.screen.getByRole('button', { name: 'Ajukan Berkas' }); }
  statusChip(status: string) { return this.screen.getByText(status, { exact: true }).first(); }
}

export class VendorProductsPage extends VendorShell {
  async open(): Promise<this> { return this.openUrl(`${urls.vendor}/catalog`); }

  productRow(productName: string) { return this.screen.getByRole('row').filter({ hasText: productName }).first(); }

  async searchProduct(productName: string): Promise<this> {
    await this.screen.getByRole('textbox', { name: 'Cari di daftar' }).fill(productName);
    await this.screen.getByRole('button', { name: 'Cari', exact: true }).tap();
    await this.productRow(productName).waitFor();
    return this;
  }

  /** Opens a SKU's detail from Produk Saya (an out-of-stock row offers only «Tersedia lagi», so restore first). */
  async openProduct(productName: string): Promise<this> {
    await this.searchProduct(productName);
    await this.productRow(productName).getByRole('button', { name: 'Lihat' }).tap();
    await this.heading(productName).waitFor();
    return this;
  }

  /** From the list: makes the SKU available again when its row is out of stock (teardown and set-up). */
  async ensureAvailableInList(productName: string): Promise<this> {
    await this.searchProduct(productName);
    const row = this.productRow(productName);
    const restore = row.getByRole('button', { name: 'Tersedia lagi' });
    await row.getByRole('button', { name: 'Lihat' }).or(restore).first().waitFor();
    if (await restore.count()) {
      await restore.tap();
      const dialog = this.screen.getByRole('dialog');
      await dialog.or(row.getByRole('button', { name: 'Lihat' })).first().waitFor();
      if (await dialog.count()) await dialog.getByRole('button', { name: /Tersedia lagi|Ya|Konfirmasi/ }).last().tap();
      await row.getByRole('button', { name: 'Lihat' }).waitFor();
    }
    return this;
  }

  // The confirmation dialog repeats the action's name, so the page buttons are the first match.
  get markOutOfStockButton() { return this.screen.getByRole('button', { name: 'Tandai stok habis' }).first(); }
  get markAvailableButton() { return this.screen.getByRole('button', { name: 'Tersedia lagi' }).first(); }

  /** Presses a stock toggle, confirms the dialog when one asks, and waits for the opposite toggle to appear. */
  private async toggleStock(press: any, expectNext: any): Promise<this> {
    await press.tap();
    const dialog = this.screen.getByRole('dialog');
    await dialog.or(expectNext).first().waitFor();
    if (await dialog.count()) await dialog.getByRole('button', { name: /Tandai stok habis|Tersedia lagi|Ya|Konfirmasi/ }).last().tap();
    await expectNext.waitFor();
    return this;
  }
  async markOutOfStock(): Promise<this> { return this.toggleStock(this.markOutOfStockButton, this.markAvailableButton); }
  async markAvailable(): Promise<this> { return this.toggleStock(this.markAvailableButton, this.markOutOfStockButton); }

  /** Makes the SKU available again when it is marked out of stock (used by teardown). */
  async ensureAvailable(): Promise<this> {
    await this.markOutOfStockButton.or(this.markAvailableButton).first().waitFor();
    if (await this.markAvailableButton.count()) await this.markAvailable();
    return this;
  }
  get pageHeading() { return this.heading('Produk Saya'); }
  statusTab(name: string) { return this.screen.getByRole('tab', { name: new RegExp(`^${name}`) }); }
  get reviewSlaNote() { return this.screen.getByText(/SLA Tim MLM \d+ hari/).first(); }
}

export class VendorProfilePage extends VendorShell {
  async open(): Promise<this> { return this.openUrl(`${urls.vendor}/profile`); }
  get pageHeading() { return this.heading('Profil Perusahaan'); }
  get srtLoaMentions() { return this.screen.getByText(/SRT-LOA/); }
  async goToContracts(): Promise<VendorContractsPage> {
    await this.openSidebarItem('REGISTRASI', 'Kontrak Vendor');
    return new VendorContractsPage(this.f);
  }
}

export class VendorUsersPage extends VendorShell {
  async open(): Promise<this> { return this.openUrl(`${urls.vendor}/users`); }
  get backToDashboardButton() { return this.screen.getByRole('button', { name: 'Kembali ke Dashboard' }); }
}

/** /activate?token=… — the new vendor user sets a password. */
export class VendorActivationPage extends VendorShell {
  get heading_() { return this.heading('Aktifkan akun vendor Anda'); }

  /** Opens the activation link in a vendor origin without any vendor session (local storage cleared first). */
  async openWithoutVendorSession(activationLink: string): Promise<this> {
    await this.app.open(`${urls.vendor}/login`);
    await this.browser.evaluate(() => { localStorage.clear(); sessionStorage.clear(); return null; });
    return this.openUrl(activationLink);
  }

  /** Sets the password (a registered secret handle) and activates; returns the accept-invitation status. */
  async activateWithPassword(password: string): Promise<number> {
    await this.screen.getByLabel('Kata Sandi Baru').fill(password);
    await this.screen.getByLabel('Konfirmasi Kata Sandi').fill(password);
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/vendor\/auth\/accept-invitation/),
      this.screen.getByRole('button', { name: 'Aktifkan Akun' }).tap(),
    ]);
    return response.status;
  }

  /** Like activateWithPassword, for a link that is expected to be refused: returns the status and its `error_code`. */
  async submitPassword(password: string): Promise<{ status: number; errorCode: string }> {
    await this.screen.getByLabel('Kata Sandi Baru').fill(password);
    await this.screen.getByLabel('Konfirmasi Kata Sandi').fill(password);
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [response] = await Promise.all([
          this.browser.waitForResponse(/\/api\/v1\/vendor\/auth\/accept-invitation/, { timeout: 10_000 }),
          this.screen.getByRole('button', { name: 'Aktifkan Akun' }).tap(),
        ]);
        return { status: response.status, errorCode: String(((await response.json()) as { error_code?: string }).error_code ?? '') };
      } catch (error) {
        lastError = error;
        if (attempt === 2) throw error;
      }
    }
    throw lastError;
  }
}

export class VendorDocumentDeadlineBanner extends VendorShell {
  get incompleteDocumentsNotice() { return this.screen.getByText('Berkas wajib belum lengkap').first(); }
  remainingDays(days: number) { return this.screen.getByText(new RegExp(`Sisa ${days} hari`)).first(); }
}

/** Vendor negotiation room: chat composer with one attachment. */
export class VendorNegotiationRoomPage extends VendorShell {
  async open(code: string): Promise<this> {
    // The list is paginated and can move the reserved negotiation off the first
    // page after a new message. Open the stable detail route directly instead.
    await this.app.open(`${urls.vendor}/negotiations/${encodeURIComponent(code)}`);
    await this.messageField.waitFor();
    return this;
  }
  get messageField() { return this.screen.getByRole('textbox', { name: 'Pesan' }); }
  get sendButton() { return this.screen.getByRole('button', { name: 'Kirim', exact: true }); }
  get chatLog() { return this.browser.locator('[role="log"]'); }
  get attachmentTooLargeAlert() { return this.screen.getByRole('alert').filter({ hasText: 'Ukuran lampiran maksimum 10 MB.' }); }
  attachmentChip(fileName: string) { return this.screen.getByText(fileName).first(); }

  /** Picks a file through «Lampirkan» (its hidden file input). */
  async attach(path: string): Promise<this> {
    await this.browser.locator('input[type=file]').last().setInputFiles(path);
    return this;
  }
  async typeMessage(text: string): Promise<this> { await this.messageField.fill(text); return this; }

  /** Sends the message and returns the messages API status. */
  async send(): Promise<number> {
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/vendor\/negotiations\/[^/]+\/messages/),
      this.sendButton.tap(),
    ]);
    return response.status;
  }
}
