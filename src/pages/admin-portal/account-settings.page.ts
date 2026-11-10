import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

/** «Profil & Keamanan Akun» (/account/settings) with the «Hak akses efektif» card. */
export class AccountSettingsPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/account/settings`); }
  get pageHeading() { return this.heading('Profil & Keamanan Akun'); }
  get pageNameOccurrences() { return this.screen.getByText('Profil & Keamanan Akun', { exact: true }); }
  get oldPageName() { return this.screen.getByText('Pengaturan akun', { exact: true }); }
  get effectiveAccessCard() { return this.screen.getByText(/^Hak akses efektif/).first(); }
  get productTypeAuthorityLabel() { return this.screen.getByText('Kewenangan tipe produk').first(); }
  productTypeWithAllRights(productType: string) {
    return this.screen.getByText(new RegExp(`${productType} \\([A-Z-]+\\): Negosiasi, Setujui Negosiasi, Aktifkan Produk`)).first();
  }
  get noAuthorityValue() { return this.screen.getByText('Tidak ada', { exact: true }).first(); }
}
