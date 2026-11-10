import { urls } from '../../testdata';
import { MemberShell } from './member-shell.page';

/** /activate?token=… from a member invitation e-mail, opened without a member session. */
export class MemberActivationPage extends MemberShell {
  async openLink(link: string): Promise<this> { return this.openUrl(link); }
  /** Types the password twice and submits; returns the accept-invitation status and its `error_code`. */
  async submitPassword(password: string): Promise<{ status: number; errorCode: string }> {
    await this.screen.getByLabel('Kata Sandi', { exact: true }).fill(password);
    await this.screen.getByLabel('Konfirmasi Kata Sandi', { exact: true }).fill(password);
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/member\/auth\/accept-invitation/),
      this.screen.getByRole('button', { name: 'Aktifkan Akun' }).tap(),
    ]);
    return { status: response.status, errorCode: String(((await response.json()) as { error_code?: string }).error_code ?? '') };
  }
  get signInAction() { return this.screen.getByRole('link', { name: 'Masuk' }).or(this.screen.getByRole('button', { name: 'Masuk' })); }
  get resendAction() { return this.screen.getByText(/Kirim ulang/); }
}

export class MemberDocumentsPage extends MemberShell {
  async open(): Promise<this> { return this.openUrl(`${urls.member}/documents`); }
}

export class MemberNotificationsPage extends MemberShell {
  async open(): Promise<this> { return this.openUrl(`${urls.member}/notifications`); }
  get pageHeading() { return this.heading(/Notifikasi/); }
  categoryWithCount(category: string) { return this.screen.getByRole('button', { name: new RegExp(`^${category} \\d+$`) }); }
  get firstNotification() { return this.screen.getByRole('heading', { name: /PO-|RQ-|Anda diundang/ }).first(); }
}

export class MemberHelpDeskPage extends MemberShell {
  async open(): Promise<this> { return this.openUrl(`${urls.member}/help-desk`); }
  get pageHeading() { return this.heading('Help Desk Member'); }
  get resultCount() { return this.screen.getByText(/^[1-9]\d* topik tersedia$/); }
  topicLink(title: RegExp) { return this.screen.getByRole('link', { name: title }).first(); }
  async search(query: string): Promise<this> {
    await this.screen.getByRole('searchbox', { name: 'Cari topik bantuan' }).fill(query);
    await this.screen.getByRole('button', { name: 'Cari', exact: true }).tap();
    return this;
  }
}
