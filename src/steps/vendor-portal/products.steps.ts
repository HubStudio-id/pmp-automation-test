// Vendor · Katalog › Produk Saya: «Stok habis» flag (CAT-06, the member side checks the catalog).
import { Given, When } from '@cucumber/cucumber';
import type { RegressionWorld } from '../../support/world';
import { data } from '../../testdata';
import { VendorProductsPage } from '../../pages';

Given('vendor V00003 has the QA stock SKU open in «Produk Saya»', async function (this: RegressionWorld) {
  this.stash.vendorProducts = await (await new VendorProductsPage(this.f).open()).openProduct(data.stockFlag.productName);
});
When('the vendor marks it out of stock', async function (this: RegressionWorld) {
  await this.stash.vendorProducts.markOutOfStock();
});
