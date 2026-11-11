// Member · Keranjang: Cito label (CART-01). Carts are emptied by the @empty-cart hooks.
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { data } from '../../testdata';
import { MemberCatalogPage, type CartPage } from '../../pages';

const cart = (world: RegressionWorld): CartPage => world.stash.cart;

Given('the QA cart product is in the member cart', async function (this: RegressionWorld) {
  this.stash.cart = await (await new MemberCatalogPage(this.f).open()).addToCart(data.member.cartProductName);
});
Given('the distributor group label is noted', async function (this: RegressionWorld) {
  this.stash.groupShowedNoCito = await cart(this).showsNoCitoGroupLabel(data.member.cartProductName);
});
When('the member marks the line as Cito', async function (this: RegressionWorld) {
  await cart(this).markAsCito(data.member.cartProductName);
  this.stash.servedSlaShown = await cart(this).showsServedCitoSla();
  this.stash.saveDisabledBeforeCondition = await cart(this).saveCitoButton.isDisabled();
});
When('the Cito condition is entered and saved', async function (this: RegressionWorld) {
  await cart(this).enterCitoCondition(data.member.citoCondition);
  await cart(this).saveCito();
});
Then('the Cito dialog showed the served Cito SLA', function (this: RegressionWorld) {
  expect(this.stash.servedSlaShown).toBe(true);
});
Then('«Simpan label Cito» was disabled before the condition', function (this: RegressionWorld) {
  expect(this.stash.saveDisabledBeforeCondition).toBe(true);
});
Then('the footer reads {string}', async function (this: RegressionWorld, pattern: string) {
  const footer = new RegExp(`^${pattern.replace('<n>', '\\d+')} (kalender|kerja)$`);
  await expect(this.page.getByText(footer)).toBeVisible();
});
Then('the summary counts {string}', async function (this: RegressionWorld, text: string) {
  await expect(this.page.getByText(text, { exact: true })).toBeVisible();
});
Then(/^the group read «Tidak ada Cito» before any line was Cito \(PMP-835\)$/, function (this: RegressionWorld) {
  expect(this.stash.groupShowedNoCito, '«Tidak ada Cito» on the distributor group (bug PMP-835)').toBe(true);
});
