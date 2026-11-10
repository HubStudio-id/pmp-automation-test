import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export class AdminContractsPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/master/contracts`); }
  get pageHeading() { return this.heading(/Kontrak/).first(); }
  contractRow(code: string) { return this.tableRows.filter({ hasText: code }).first(); }
  /** Searches «Cari di daftar» and waits for the contracts API. */
  async search(text: string): Promise<this> {
    const box = this.screen.getByRole('searchbox', { name: 'Cari di daftar' });
    await box.fill(text);
    await Promise.all([this.browser.waitForResponse(/\/api\/v1\/admin\/contracts\?/), box.press('Enter')]);
    return this.waitForTableLoaded();
  }
}
