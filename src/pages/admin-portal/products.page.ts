import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

/**
 * Master › Produk (SKU): search, «Detail Produk» dialog (MF attribution), «Tambah Produk» dialog (nothing saved) and
 * «Edit Produk» › «Tambah baris harga» (CAT-07 saves one new HNA line on its reserved QA SKU).
 */
export class AdminProductsPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/catalog/products`); }

  /** Opens the list and returns `pagination.count` of the request behind its first page. */
  async openAndReadApiTotal(): Promise<number> {
    const [response] = await Promise.all([this.browser.waitForResponse(/\/api\/v1\/mdl-mappings\?page=1&per_page=25$/), this.open()]);
    return ((await response.json()) as { pagination: { count: number } }).pagination.count;
  }
  /** Footer «Menampilkan 25 dari 2872 SKU». */
  footerTotal(shown: number, total: number) { return this.screen.getByText(`Menampilkan ${shown} dari ${total} SKU`, { exact: true }); }
  get lastPageItem() { return this.lastPagerItem; }

  get searchField() { return this.screen.getByRole('textbox', { name: 'Cari produk' }); }
  productRow(productName: string) { return this.screen.getByRole('row').filter({ hasText: productName }).first(); }
  viewDetailButton(productName: string) { return this.productRow(productName).getByRole('button', { name: `Lihat Detail ${productName}` }); }
  editButton(productName: string) { return this.productRow(productName).getByRole('button', { name: 'Edit Produk' }); }

  async search(productName: string): Promise<this> {
    await this.searchField.fill(productName);
    await this.searchField.press('Enter');
    return this;
  }

  // Detail Produk
  get detailDialog() { return this.screen.getByRole('dialog', { name: 'Detail Produk' }); }
  get externalReferenceSection() { return this.detailDialog.getByRole('heading', { name: 'REFERENSI EKSTERNAL' }); }
  get marketingAuthorisationLabel() { return this.detailDialog.getByText('Izin Edar', { exact: true }); }
  get feeAttributionSection() { return this.detailDialog.getByRole('heading', { name: 'ATRIBUSI JASA MANAJEMEN SKU INI' }); }
  get defaultFeeRate() { return this.detailDialog.getByText(/^\d+([,.]\d+)? % \(bawaan\)$/).first(); }
  get firstPriceLineHeading() { return this.detailDialog.getByRole('heading', { name: /· baris \d+$/ }).first(); }
  get feeRateField() { return this.detailDialog.getByRole('spinbutton', { name: 'Tarif MF (%)' }); }

  async openFirstProductDetail(): Promise<this> { await this.screen.getByRole('button', { name: /^Lihat Detail / }).first().tap(); return this; }
  async startEditingFeeAttribution(): Promise<this> { await this.screen.getByRole('button', { name: 'Ubah penanggung atau tarif' }).tap(); return this; }
  async typeFeeRate(rate: string): Promise<this> { await this.feeRateField.fill(rate); return this; }
  async cancelFeeAttributionEdit(): Promise<this> { await this.detailDialog.getByRole('button', { name: 'Batal' }).tap(); return this; }

  // Tambah Produk
  get addProductDialog() { return this.screen.getByRole('dialog', { name: 'Tambah Produk' }); }
  get contractReferencePicker() { return this.addProductDialog.getByRole('combobox', { name: 'Ref. kontrak (sistem)' }); }
  /** Picker options read «KTR-00043 · <official number> · <status>»; the format only exists inside the open picker. */
  contractReferenceOptions(status: RegExp = /Draf|Aktif/) {
    return this.screen.getByText(new RegExp(`^KTR-\\d{5} · .+ · (${status.source})$`));
  }

  async openAddProductDialog(): Promise<this> { await this.screen.getByRole('button', { name: 'Tambah Produk' }).tap(); return this; }
  async chooseDistributorAndPrincipal(distributor: string, principal: string): Promise<this> {
    await this.addProductDialog.getByRole('combobox', { name: 'Distributor produk' }).fill(distributor);
    await this.screen.getByText(distributor, { exact: true }).last().tap();
    await this.addProductDialog.getByRole('combobox', { name: 'Principal produk' }).fill(principal);
    await this.screen.getByText(principal, { exact: true }).last().tap();
    return this;
  }
  async openContractReferencePicker(): Promise<this> { await this.contractReferencePicker.tap(); return this; }
  async closeAddProductDialog(): Promise<this> { await this.addProductDialog.getByRole('button', { name: /Batal|Tutup|Close/ }).first().tap(); return this; }

  // «Edit Produk» (from Detail Produk)
  get editDialog() { return this.screen.getByRole('dialog', { name: 'Edit Produk' }); }
  async startEditingProduct(): Promise<this> {
    await this.detailDialog.getByRole('button', { name: 'Edit', exact: true }).tap();
    await this.editDialog.waitFor();
    return this;
  }
  /** Adds a price line and types its HNA; the line inherits discount, dates and region from the live line. */
  async addPriceLine(hna: number): Promise<this> {
    await this.editDialog.getByRole('button', { name: 'Tambah baris harga' }).tap();
    await this.editDialog.getByRole('spinbutton', { name: 'HNA per satuan beli' }).last().fill(String(hna));
    return this;
  }
  /** Saves «Simpan Produk» and returns the SKU save status and body (the body explains a refusal). */
  async saveProduct(): Promise<{ status: number; body: any }> {
    const [response] = await Promise.all([
      this.browser.waitForResponse(/\/api\/v1\/mdl-mappings\/[^/?]+$/),
      this.editDialog.getByRole('button', { name: 'Simpan Produk' }).tap(),
    ]);
    return { status: response.status, body: await response.json().catch(() => null) };
  }
}
