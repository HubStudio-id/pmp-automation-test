import { urls } from '../../testdata';
import { MemberShell } from './member-shell.page';

export const CART_API = /\/api\/v1\/member\/cart/;

/** Keranjang. Tests never submit the cart; lines they add are removed again. */
export class CartPage extends MemberShell {
  get cartButton() { return this.screen.getByRole('button', { name: /^Keranjang \d+ item/ }); }

  /** Opens the cart from any member page through the header button and waits until the cart has rendered. */
  async openFromCurrentPage(): Promise<this> {
    // The catalog shell and its cart count are API-backed; wait for the header before clicking it.
    await this.cartButton.waitFor({ timeout: 30_000 });
    await this.cartButton.tap();
    await this.browser.waitForURL(/\/cart$/);
    await this.autosaveStatus.or(this.emptyCartMessage).first().waitFor();
    return this;
  }

  /** Opens the catalog first, then the cart (a direct /cart load can show the cart empty). */
  async openFromHeader(): Promise<this> {
    await this.app.open(`${urls.member}/catalog`);
    return this.openFromCurrentPage();
  }
  get pageHeading() { return this.heading('Keranjang'); }
  get autosaveStatus() { return this.screen.getByText(/^Tersimpan otomatis/); }
  get emptyCartMessage() { return this.screen.getByText('Keranjang Anda masih kosong'); }
  get anyRemoveButton() { return this.screen.getByRole('button', { name: /^Hapus / }); }
  citoSwitch(productName: string) { return this.screen.getByRole('switch', { name: `Cito ${productName}` }); }

  // Cito dialog
  get citoDialog() { return this.screen.getByRole('dialog'); }
  get citoSlaText() { return this.citoDialog.getByText(/SLA pengantaran Cito \d+ hari (kalender|kerja)/); }
  get saveCitoButton() { return this.citoDialog.getByRole('button', { name: /Simpan label Cito/ }); }
  get citoFooterLine() { return this.screen.getByText(/^1 item Cito · SLA pengantaran Cito \d+ hari (kalender|kerja)$/); }
  get citoCountInSummary() { return this.screen.getByText('1 Cito', { exact: true }); }
  get noCitoGroupLabel() { return this.screen.getByText('Tidak ada Cito'); }

  /** Waits until the line of the SKU has rendered, then reports whether «Tidak ada Cito» is shown on its group. */
  async showsNoCitoGroupLabel(productName: string): Promise<boolean> {
    await this.citoSwitch(productName).waitFor();
    return (await this.noCitoGroupLabel.count()) > 0;
  }

  /** Waits for the served Cito SLA in the open Cito dialog; false when it does not appear within the action timeout. */
  async showsServedCitoSla(): Promise<boolean> {
    return this.citoSlaText.waitFor().then(() => true, () => false);
  }

  /** Turns Cito on and waits for its dialog. The cart re-renders once after loading and can swallow the first tap. */
  async markAsCito(productName: string): Promise<this> {
    const DIALOG_OPEN_MS = 3000;
    await this.citoSwitch(productName).tap();
    const opened = await this.citoDialog.waitFor({ timeout: DIALOG_OPEN_MS }).then(() => true, () => false);
    if (!opened) await this.citoSwitch(productName).tap();
    await this.citoDialog.waitFor();
    return this;
  }
  async enterCitoCondition(condition: string): Promise<this> {
    await this.citoDialog.getByRole('textbox').first().fill(condition);
    return this;
  }
  async saveCito(): Promise<this> { await this.saveCitoButton.tap(); return this; }

  /** Removes every line, one at a time, waiting after each for the cart API and the re-rendered cart. */
  async removeAllLines(): Promise<this> {
    await this.autosaveStatus.or(this.emptyCartMessage).first().waitFor();
    while (await this.anyRemoveButton.count()) {
      await this.anyRemoveButton.first().tap();
      await Promise.all([
        this.browser.waitForResponse(CART_API),
        this.screen.getByRole('dialog').getByRole('button', { name: 'Hapus item' }).tap(),
      ]);
      await this.screen.getByRole('dialog').waitFor({ state: 'hidden' });
      await this.autosaveStatus.or(this.emptyCartMessage).first().waitFor();
    }
    return this;
  }
}
