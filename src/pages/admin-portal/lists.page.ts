// Admin lists that share the list bar: «Cari di daftar» + «Cari», «n hasil», «Menampilkan a–b dari n» and the pager.
import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export abstract class AdminListPage extends AdminShell {
  protected abstract readonly path: string;
  /** The unfiltered first-page request the list sends when it opens. */
  protected abstract readonly firstPageRequest: RegExp;

  async open(): Promise<this> { return this.openUrl(`${urls.admin}${this.path}`); }

  /** Opens the list and returns `pagination.count` of the request behind the first page. */
  async openAndReadApiTotal(): Promise<number> {
    const [response] = await Promise.all([this.browser.waitForResponse(this.firstPageRequest), this.open()]);
    return ((await response.json()) as { pagination: { count: number } }).pagination.count;
  }

  get searchBox() { return this.screen.getByRole('searchbox', { name: 'Cari di daftar' }); }
  async searchFor(text: string): Promise<this> {
    await this.searchBox.fill(text);
    await this.screen.getByRole('button', { name: 'Cari', exact: true }).tap();
    return this;
  }

  resultCount(total: number) { return this.screen.getByText(`${total} hasil`, { exact: true }); }
  rangeLabel(from: number, to: number, total: number) { return this.screen.getByText(`Menampilkan ${from}–${to} dari ${total}`, { exact: true }); }
  emptyState(message: string) { return this.screen.getByText(message, { exact: true }); }
  get dataRows() { return this.tableRows; }
  rowWith(text: string) { return this.tableRows.filter({ hasText: text }); }
  /** The highest page number the pager offers (its last numbered item). */
  get lastPageItem() { return this.lastPagerItem; }
}

/** Transaksi › Invoice. */
export class AdminInvoicesPage extends AdminListPage {
  protected readonly path = '/transactions/invoices';
  protected readonly firstPageRequest = /\/api\/v1\/admin\/invoices\?tab=all&page=1&per_page=25$/;
}
