import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

/** Transaksi › Tugas Admin: the task list (search by reference) and a task's detail page («Buka»). */
export class AdminTasksPage extends AdminShell {
  async open(): Promise<this> {
    await this.openUrl(`${urls.admin}/admin/tasks`);
    return this.waitForTableLoaded();
  }
  get pageHeading() { return this.heading('Tugas Admin'); }
  get firstTaskRow() { return this.tableRows.first(); }
  taskRow(reference: string) { return this.tableRows.filter({ hasText: reference }).first(); }

  /** Searches «Cari di daftar» and waits for the task API to answer. */
  async search(text: string): Promise<this> {
    await this.screen.getByRole('searchbox', { name: 'Cari di daftar' }).fill(text);
    await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/admin\/tasks\?/),
      this.screen.getByRole('searchbox', { name: 'Cari di daftar' }).press('Enter'),
    ]);
    return this.waitForTableLoaded();
  }
  /** In-app navigation (pushState, no «load» event): wait for the detail's «Riwayat tindakan» section instead. */
  async openTask(reference: string): Promise<this> {
    await this.taskRow(reference).getByRole('button', { name: /^Buka/ }).tap();
    await this.heading('Riwayat tindakan').waitFor();
    return this;
  }
  get detail() { return this.screen.getByRole('main'); }
}
