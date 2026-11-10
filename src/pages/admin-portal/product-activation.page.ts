import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export class ProductActivationPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/catalog/product-activation`); }
  get pageHeading() { return this.heading('Aktivasi Produk').first(); }
  get queueTableFirstRow() { return this.screen.getByRole('row').nth(1); }
  get queueLoadError() { return this.screen.getByText(/Data antrean Aktivasi.*(belum dapat|gagal)/); }
  /** Queue tab whose label starts with `name` (the label ends with its count). */
  tab(name: string) { return this.screen.getByRole('tab', { name: new RegExp(`^${name}`) }); }
  /** The «Lihat» drawer of a product, named after the product. */
  get productDrawer() { return this.screen.getByRole('dialog').last(); }

  /** Opens the «Lihat» drawer of the first product on the current tab. */
  async viewFirstProduct(): Promise<this> {
    await this.queueTableFirstRow.waitFor();
    await this.screen.getByRole('button', { name: /^Lihat/ }).first().tap();
    await this.productDrawer.waitFor();
    return this;
  }
}
