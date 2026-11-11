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

  /**
   * Opens the catalog first, then the cart (a direct /cart load can show the cart empty). Used by the @empty-cart
   * clean-up: the header count waits on delivery-points → cart, and on CI that chain sometimes never renders the
   * count (run 42827429518, 10 Nov 2026), so the catalog is loaded once more before giving up.
   */
  async openFromHeader(): Promise<this> {
    await this.app.open(`${urls.member}/catalog`);
    const shown = await this.cartButton.waitFor({ timeout: 15_000 }).then(() => true, () => false);
    if (!shown) await this.app.open(`${urls.member}/catalog`);
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
  /** Saves the label and waits until the cart API has stored it and the dialog has closed. */
  async saveCito(): Promise<this> {
    await Promise.all([this.browser.waitForResponse(CART_API), this.saveCitoButton.tap()]);
    await this.citoDialog.waitFor({ state: 'hidden' });
    return this;
  }

  /**
   * Removes every line, then reopens the cart through the catalog to check that the stored cart is empty, up to three
   * rounds. Why not «wait for the cart API after each removal»: on CI that answer sometimes never came within 30 s
   * (11 Nov 2026: no API response at all after «Hapus item»), which failed the @empty-cart clean-up while the line
   * may or may not have been removed. The reopened cart is what the next run starts from, so that is what is checked.
   */
  async removeAllLines(): Promise<this> {
    const ROUNDS = 3;
    for (let round = 1; ; round++) {
      await this.autosaveStatus.or(this.emptyCartMessage).first().waitFor();
      while (await this.anyRemoveButton.count()) await this.removeFirstLine();
      await this.openFromHeader();
      const left = await this.anyRemoveButton.count();
      if (!left) return this;
      if (round === ROUNDS) throw new Error(`the cart still has ${left} line(s) after ${ROUNDS} rounds of «Hapus item»`);
    }
  }

  /** Removes the first line: confirms «Hapus item» (tapping «Hapus» again when the re-rendering cart swallowed it). */
  private async removeFirstLine(): Promise<void> {
    const DIALOG_OPEN_MS = 3000;
    const SAVE_MS = 15_000;
    const lines = await this.anyRemoveButton.count();
    const dialog = this.screen.getByRole('dialog');
    await this.anyRemoveButton.first().tap();
    const opened = await dialog.waitFor({ timeout: DIALOG_OPEN_MS }).then(() => true, () => false);
    if (!opened) await this.anyRemoveButton.first().tap();
    // The save is checked by reopening the cart (removeAllLines), so a slow or missing answer only shortens the wait.
    const saved = this.browser.waitForResponse(CART_API, { timeout: SAVE_MS }).catch(() => undefined);
    await dialog.getByRole('button', { name: 'Hapus item' }).tap();
    await dialog.waitFor({ state: 'hidden' });
    await saved;
    await this.anyRemoveButton.nth(lines - 1).waitFor({ state: 'detached', timeout: SAVE_MS }).catch(() => undefined);
  }
}
