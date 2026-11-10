import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

/** Aksi label of an admin_deactivate log row. */
const ADMIN_DEACTIVATED_ACTION = 'Admin dinonaktifkan';

export class ArchivePage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/audit/archive`); }
  get pageHeading() { return this.heading('Arsip'); }
  tab(name: string) { return this.screen.getByRole('tab', { name: new RegExp(`^${name} \\d+$`) }); }
  get cancelledInvitationRows() { return this.screen.getByRole('row').filter({ hasText: /dibatalkan/ }); }
  async showTab(name: string): Promise<this> { await this.tab(name).tap(); return this.waitForTableLoaded(); }
}

export class ActivityLogPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/activity-log`); }
  /** Switches tab and waits for the log API to answer before reading rows (the old rows stay until it does). */
  async showTab(name: string): Promise<this> {
    await Promise.all([this.browser.waitForResponse(/\/api\/v1\/admin\/activity-logs/), this.screen.getByRole('tab', { name }).tap()]);
    return this.waitForTableLoaded();
  }
  async search(text: string): Promise<this> {
    await this.screen.getByRole('searchbox', { name: 'Cari di daftar' }).fill(text);
    await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/admin\/activity-logs/),
      this.screen.getByRole('button', { name: 'Cari', exact: true }).tap(),
    ]);
    return this.waitForTableLoaded();
  }
  get superAdminTransferRow() { return this.screen.getByRole('row').filter({ hasText: /Super Admin .* dialihkan kepada/ }).first(); }
  /**
   * «Nonaktifkan & arsipkan» on an admin is logged as action_type admin_deactivate under «Akun & peran»;
   * the table shows it as Aksi «Admin dinonaktifkan» (the raw key is not rendered).
   */
  archivedAdminRow(adminName: string) {
    return this.screen.getByRole('row')
      .filter({ has: this.screen.getByRole('cell', { name: ADMIN_DEACTIVATED_ACTION }) })
      .filter({ hasText: adminName })
      .first();
  }
}
