import { urls } from '../../testdata';
import { MemberShell } from './member-shell.page';
import { CartPage, CART_API } from './cart.page';

export class MemberCatalogPage extends MemberShell {
  async open(): Promise<this> { return this.openUrl(`${urls.member}/catalog`); }
  get pageHeading() { return this.heading('Katalog Produk'); }
  get addToCartDialog() { return this.screen.getByRole('dialog'); }

  get searchField() { return this.screen.getByRole('textbox', { name: 'Cari di daftar' }); }
  productHeading(productName: string) { return this.screen.getByRole('heading', { name: productName, exact: true }); }

  /** Filters the catalog down to one SKU and waits until its card is shown. */
  async searchProduct(productName: string): Promise<this> {
    await this.searchField.fill(productName);
    await this.searchField.press('Enter');
    await this.productHeading(productName).waitFor();
    return this;
  }

  get addToCartButtons() { return this.screen.getByRole('button', { name: 'Tambah ke keranjang' }); }
  /** An out-of-stock card keeps showing the SKU but replaces «Tambah ke keranjang» with a disabled «Stok habis». */
  get outOfStockNote() { return this.screen.getByText('Stok habis · tetap tampil, tidak dapat dipesan').first(); }
  get outOfStockButton() { return this.screen.getByRole('button', { name: 'Stok habis', exact: true }).first(); }

  /** Opens «Tambah ke keranjang» for the SKU (the catalog is filtered to it first). */
  async openAddToCart(productName: string): Promise<this> {
    await this.searchProduct(productName);
    await this.screen.getByRole('button', { name: 'Tambah ke keranjang' }).first().tap();
    await this.addToCartDialog.waitFor();
    return this;
  }

  /** Adds the SKU, waits for the cart API to save it, then opens the cart through the header button. */
  async addToCart(productName: string): Promise<CartPage> {
    await this.openAddToCart(productName);
    await Promise.all([
      this.browser.waitForResponse(CART_API),
      this.addToCartDialog.getByRole('button', { name: 'Tambahkan ke keranjang' }).tap(),
    ]);
    return new CartPage(this.f).openFromCurrentPage();
  }
}
