// Admin · Master › Aktivasi Produk queue and «Lihat» drawer (CAT-02, CAT-09), Detail Produk MF rate (CAT-04),
// Edit Produk new HNA line that the member sees (CAT-07).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { ProductActivationPage, AdminProductsPage } from '../../pages';
import { data, urls } from '../../testdata';
import { memberGet } from '../../utils/member-api';
import { adminRequest } from '../../utils/admin-api';

When('the Aktivasi Produk queue is opened', async function (this: RegressionWorld) {
  this.stash.activation = await new ProductActivationPage(this.f).open();
  await expect(this.stash.activation.pageHeading).toBeVisible();
});
Then('the queue shows at least one row', async function (this: RegressionWorld) {
  await expect(this.stash.activation.queueTableFirstRow).toBeVisible();
});
Then('no queue load error is shown', async function (this: RegressionWorld) {
  await expect(this.stash.activation.queueLoadError).toHaveCount(0);
  await expect(this.stash.activation.accessDeniedMessage).toHaveCount(0);
});

Given('the MF attribution of the first product is being edited', async function (this: RegressionWorld) {
  this.stash.products = await (await new AdminProductsPage(this.f).open()).openFirstProductDetail();
  await this.stash.products.startEditingFeeAttribution();
});
When('the MF rate {string} is typed', async function (this: RegressionWorld, rate: string) {
  await this.stash.products.typeFeeRate(rate);
});

// ---- CAT-09 (PMP-739): the «Lihat» drawer of a product waiting for verification ----
When('the first product waiting for verification is viewed', async function (this: RegressionWorld) {
  const tab = data.productActivation.waitingTab;
  await expect(this.stash.activation.tab(tab), `precondition: the «${tab}» tab is the one shown`).toHaveAttribute('aria-selected', 'true');
  await this.stash.activation.viewFirstProduct();
});
Then('the drawer shows the MF attribution section', async function (this: RegressionWorld) {
  await expect(this.stash.activation.productDrawer.getByRole('heading', { name: data.productActivation.feeAttributionHeading })).toBeVisible();
});
Then('the drawer offers the MF change, reject and approve actions', async function (this: RegressionWorld) {
  for (const action of data.productActivation.drawerActions as string[]) {
    await expect(this.stash.activation.productDrawer.getByRole('button', { name: action })).toBeVisible();
  }
});

// ---- CAT-07 (PMP-735): a new HNA line on an Aktif SKU goes live for the member ----
async function memberPrice(world: RegressionWorld): Promise<number> {
  const { productName, sku } = data.hnaChange;
  await world.f.app.open(`${urls.member}/dashboard`);
  const catalog = await memberGet(world.f.browser, `/member/catalog?q=${encodeURIComponent(productName)}&per_page=25`);
  expect(catalog.status).toBe(200);
  const row = (catalog.body?.data ?? []).find((r: any) => r.sku_code === sku);
  expect(row, `precondition: ${productName} (${sku}) is in the member catalogue`).toBeDefined();
  return row.catalog_price.per_purchase_unit;
}
/**
 * Price lines are ordered by «Berlaku dari»: two lines that start the same day have equal priority and Core refuses the
 * second («Overlapping price rows have equal priority»). So the suite can add one HNA line per calendar day on this SKU.
 * A rerun on the same day verifies the line the earlier run added (it must be live and be the member price) instead of
 * adding a line that is bound to be refused — the data stays reusable on every run («Test data» rule 1).
 */
const jakartaToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
async function todaysPriceLine(world: RegressionWorld): Promise<any | undefined> {
  await world.f.app.open(`${urls.admin}/`);
  const list = await adminRequest(world.f.browser, 'GET', `/mdl-mappings?q=${encodeURIComponent(data.hnaChange.productName)}&per_page=5`);
  const mapping = (list.body?.data ?? []).find((r: any) => JSON.stringify(r).includes(data.hnaChange.sku.split('-')[0]));
  expect(mapping, `precondition: ${data.hnaChange.productName} is in Master › Produk`).toBeDefined();
  const lines = (await adminRequest(world.f.browser, 'GET', `/mdl-mappings/${mapping.slug}`)).body?.data?.price_lines ?? [];
  return lines.find((line: any) => line.valid_from === jakartaToday());
}
Given('the member price of the reserved HNA SKU is read', async function (this: RegressionWorld) {
  const [low, high] = data.hnaChange.hnaValues as number[];
  this.stash.todayLine = await todaysPriceLine(this);
  this.stash.priceBefore = await memberPrice(this);
  // Alternate between two values so the price never drifts: the new HNA is always the other value.
  this.stash.newHna = this.stash.todayLine ? this.stash.todayLine.hna_per_purchase_unit : this.stash.priceBefore === low ? high : low;
});
When('Admin adds a price line with the other HNA and saves the product', async function (this: RegressionWorld) {
  if (this.stash.todayLine) {
    this.attach(`A price line starting today already exists (${this.stash.todayLine.code}, Rp ${this.stash.todayLine.hna_per_purchase_unit}): a second one would be refused for equal priority, so this run verifies that line instead of adding one.`, 'text/plain');
    return;
  }
  const products = await (await new AdminProductsPage(this.f).open()).search(data.hnaChange.productName);
  await products.editButton(data.hnaChange.productName).tap();
  await products.editDialog.waitFor();
  this.stash.save = await (await products.addPriceLine(this.stash.newHna)).saveProduct();
});
Then('the product is saved', async function (this: RegressionWorld) {
  if (this.stash.todayLine) {
    expect(this.stash.todayLine.activated_at, `today's line ${this.stash.todayLine.code} went live`).toBeTruthy();
    return;
  }
  const { status, body } = this.stash.save;
  expect(status, `save answered ${status}: ${JSON.stringify(body?.errors ?? body?.message ?? body?.error_code ?? '').slice(0, 400)}`).toBe(200);
  const line = await todaysPriceLine(this);
  expect(line?.activated_at, 'the new line is activated (not left with activated_at null)').toBeTruthy();
});
Then('the member catalogue shows the new HNA', async function (this: RegressionWorld) {
  expect(await memberPrice(this), `member price (before this run ${this.stash.priceBefore})`).toBe(this.stash.newHna);
});

// ---- CAT-02 (PMP-744 AC2): every pair price row is usable, so one bad row cannot break the whole queue ----
Then('every pair price in the queue has a numeric price and a ready flag', async function (this: RegressionWorld) {
  const queue = await adminRequest(this.f.browser, 'GET', '/admin/product-activations?tab=pending&per_page=100');
  expect(queue.status).toBe(200);
  const pairs: any[] = queue.body?.pair_prices ?? [];
  expect(pairs.length, 'precondition: the queue answers pair prices (none would make this check empty)').toBeGreaterThan(0);
  const unusable = pairs.filter((p) => typeof p.price_idr !== 'number' || typeof p.ready !== 'boolean').map((p) => p.code ?? p.slug);
  expect(unusable, 'pair prices without a numeric price_idr or a boolean ready').toEqual([]);
});
