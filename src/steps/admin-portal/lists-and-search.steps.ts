// Admin · list bar (counts, page size, pager, number search) on Invoice and Produk.
// Cucumber matches step text whatever the keyword, so «Given/When … is opened» is defined once (as Given).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { data } from '../../testdata';
import { adminRequest } from '../../utils/admin-api';
import { AdminInvoicesPage, AdminProductsPage, type AdminListPage } from '../../pages';

const PAGE_SIZE: number = data.lists.pageSize;
function list(world: RegressionWorld): AdminListPage { return world.stash.list; }

/** An invoice number whose last segment no other invoice number ends with, so a suffix search must return it alone. */
async function invoiceWithUniqueSuffix(world: RegressionWorld): Promise<string> {
  const numbers: string[] = ((await adminRequest(world.f.browser, 'GET', '/admin/invoices?tab=all&per_page=100')).body?.data ?? [])
    .map((invoice: any) => String(invoice.invoice_number)).filter((number: string) => number.split('-').length >= 3);
  const last = (number: string) => number.split('-').at(-1)!;
  const unique = numbers.find((number) => last(number).length >= 4 && numbers.filter((other) => other.endsWith(`-${last(number)}`)).length === 1);
  if (!unique) throw new Error('no invoice number with a unique last segment on staging');
  return unique;
}

// ---- Admin Invoice (LIST-01) ----
Given('the Admin Invoice list is opened', async function (this: RegressionWorld) {
  this.stash.list = new AdminInvoicesPage(this.f);
  this.stash.apiTotal = await list(this).openAndReadApiTotal();
});
Then('the list shows rows 1 to 25 of the API total', async function (this: RegressionWorld) {
  const total: number = this.stash.apiTotal;
  expect(total, 'the staging invoice list needs more than one page for this check').toBeGreaterThan(PAGE_SIZE);
  await expect(list(this).resultCount(total)).toBeVisible();
  await expect(list(this).rangeLabel(1, PAGE_SIZE, total)).toBeVisible();
  await expect(list(this).dataRows).toHaveCount(PAGE_SIZE);
});
Then('the pager ends at the last page of the API total', async function (this: RegressionWorld) {
  const page = this.stash.list ?? this.stash.products;
  await expect(page.lastPageItem).toHaveAttribute('title', String(Math.ceil(this.stash.apiTotal / PAGE_SIZE)));
});

When("the list is searched for an invoice's full number", async function (this: RegressionWorld) {
  this.stash.invoiceNumber = await invoiceWithUniqueSuffix(this);
  await list(this).searchFor(this.stash.invoiceNumber);
});
When('the list is searched for the last segment of that number', async function (this: RegressionWorld) {
  await list(this).searchFor(this.stash.invoiceNumber.split('-').at(-1));
});
When('the list is searched for the middle segment of an invoice number', async function (this: RegressionWorld) {
  // INV-2025-1001 → «2025»: a middle segment must not find a document by its number (PMP-87 AC1).
  const number = await invoiceWithUniqueSuffix(this);
  await list(this).searchFor(number.split('-').at(-2)!);
});
When('the list is searched for the unknown text', async function (this: RegressionWorld) {
  await list(this).searchFor(data.lists.unknownSearch);
});
Then('only that invoice is listed, with {string}', async function (this: RegressionWorld, count: string) {
  await expect(list(this).resultCount(Number.parseInt(count, 10))).toBeVisible();
  await expect(list(this).rangeLabel(1, 1, 1)).toBeVisible();
  await expect(list(this).dataRows).toHaveCount(1);
  await expect(list(this).rowWith(this.stash.invoiceNumber)).toHaveCount(1);
});
Then('the list is empty, with {string}', async function (this: RegressionWorld, count: string) {
  await expect(list(this).resultCount(Number.parseInt(count, 10))).toBeVisible();
  await expect(list(this).emptyState(data.lists.emptyListMessage)).toBeVisible();
  await expect(list(this).dataRows).toHaveCount(0);
});

// ---- Admin Produk (LIST-01, PMP-60) ----
When('the Admin product list is opened', async function (this: RegressionWorld) {
  this.stash.products = new AdminProductsPage(this.f);
  this.stash.apiTotal = await this.stash.products.openAndReadApiTotal();
});
Then('the product footer shows 25 of the API total', async function (this: RegressionWorld) {
  await expect(this.stash.products.footerTotal(PAGE_SIZE, this.stash.apiTotal)).toBeVisible();
});
