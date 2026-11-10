// Member · Pembelian › Buat Pesanan › Katalog: «Stok habis» SKU (CAT-06,
// the vendor side sets the flag).
import { When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { data } from '../../testdata';
import { MemberCatalogPage } from '../../pages';

When('the member searches the catalog for it', async function (this: RegressionWorld) {
  this.stash.catalog = await (await new MemberCatalogPage(this.f).open()).searchProduct(data.stockFlag.productName);
});
Then('the card says {string}', async function (this: RegressionWorld, text: string) {
  await expect(this.page.getByText(text, { exact: false }).first()).toBeVisible();
});
Then('its «Stok habis» button is disabled', async function (this: RegressionWorld) {
  await expect(this.stash.catalog.outOfStockButton).toBeDisabled();
});
Then('no «Tambah ke keranjang» is offered', async function (this: RegressionWorld) {
  await expect(this.stash.catalog.addToCartButtons).toHaveCount(0);
});
