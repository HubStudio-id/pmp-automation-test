import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';
import { ANT } from '../base.page';

/** Manajemen Pengguna › Admin › detail, with the «Alihkan Super Admin» dialog. Never confirms a transfer. */
export class AdminDetailPage extends AdminShell {
  async open(adminSlug: string): Promise<this> { return this.openUrl(`${urls.admin}/user-management/admins/${adminSlug}`); }
  get transferButton() { return this.screen.getByRole('button', { name: 'Alihkan Super Admin' }); }
  get lockOrDeactivateButtons() { return this.screen.getByRole('button', { name: /^(Kunci|Nonaktifkan)/ }); }
  get transferDialog() { return this.screen.getByRole('dialog', { name: 'Alihkan Super Admin' }); }
  get confirmTransferButton() { return this.transferDialog.getByRole('button', { name: 'Konfirmasi' }); }
  get confirmationEmailField() { return this.transferDialog.getByRole('textbox', { name: 'Ketik email admin untuk konfirmasi' }); }
  get reasonField() { return this.transferDialog.getByRole('textbox', { name: 'Alasan' }); }

  async openTransferDialog(): Promise<this> { await this.transferButton.tap(); return this; }
  async typeConfirmationEmail(email: string): Promise<this> { await this.confirmationEmailField.fill(email); return this; }
  async typeReason(reason: string): Promise<this> { await this.reasonField.fill(reason); return this; }
  // Lock state
  /** «Dikunci <time> · …» is shown only while the account is locked (the «Status akun» legend always lists «Terkunci»). */
  get lockedNote() { return this.screen.getByText(/^Dikunci \d/); }
  get automaticLockNote() { return this.screen.getByText(/^Dikunci .* · Otomatis · Terbuka otomatis /); }
  get lockButton() { return this.screen.getByRole('button', { name: 'Kunci Akun' }); }
  get unlockButton() { return this.screen.getByRole('button', { name: 'Buka Kunci Akun' }); }

  /** Unlocks the account when it is locked (confirms the dialog when one asks); returns this page reloaded. */
  async unlockIfLocked(adminSlug: string): Promise<this> {
    await this.lockButton.or(this.unlockButton).first().waitFor();
    if (await this.unlockButton.count()) {
      await this.unlockButton.tap();
      const confirm = this.screen.getByRole('dialog').getByRole('button', { name: /Buka Kunci|Ya|Konfirmasi/ });
      await confirm.or(this.lockButton).first().waitFor();
      if (await confirm.count()) await confirm.last().tap();
      await this.lockButton.waitFor();
    }
    return this.open(adminSlug);
  }

  // Edit Detail (role)
  get roleField() { return this.screen.getByRole('combobox', { name: 'Peran' }); }
  get saveChangesButton() { return this.screen.getByRole('button', { name: 'Simpan Perubahan' }); }
  get errorAlert() { return this.screen.getByRole('alert').first(); }

  async startEditing(): Promise<this> { await this.screen.getByRole('button', { name: 'Edit Detail' }).tap(); return this; }
  async cancelEditing(): Promise<this> { await this.screen.getByRole('button', { name: 'Batal' }).tap(); return this; }

  /** The role selected in «Edit Detail» (opens and cancels the edit). */
  async currentRoleName(): Promise<string> {
    await this.startEditing();
    // The read-only select keeps an empty input; the chosen role is the selection item's title.
    const selected = this.browser.locator(`${ANT.selectValue}:has(input[aria-label="Peran"])`);
    const name = ((await selected.getAttribute('title')) ?? (await selected.textContent()) ?? '').trim();
    await this.cancelEditing();
    return name;
  }

  /**
   * Picks a role in «Peran»: a read-only select with a virtual list (typing does not filter), so the open list is
   * scrolled until the option renders. The options have no accessible scope, hence the CSS locator.
   */
  async chooseRole(roleName: string): Promise<this> {
    const MAX_SCROLLS = 60;
    const SCROLL_STEP_PX = 96;
    const openList = ANT.openDropdown;
    await this.roleField.tap();
    await this.browser.locator(openList).waitFor();

    // Ant Design does not consistently put `title` on virtualised options. The visible
    // option text is the stable contract, so match the option element by its exact text.
    const escapedRole = roleName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const option = this.browser
      .locator(`${openList} ${ANT.selectOption}`)
      .filter({ hasText: new RegExp(`^\\s*${escapedRole}\\s*$`) })
      .first();
    // The list opens at the selected role: start from the top, then step down and let the virtual list re-render.
    const scroll = (top: boolean) => this.browser.evaluate(async ({ list, step, top }: { list: string; step: number; top: boolean }) => {
      const holder = document.querySelector(`${list} .rc-virtual-list-holder`);
      if (!holder) return null;
      holder.scrollTop = top ? 0 : holder.scrollTop + step;
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
      return null;
    }, { list: openList, step: SCROLL_STEP_PX, top });
    await scroll(true);
    for (let i = 0; i < MAX_SCROLLS && !(await option.count()); i++) await scroll(false);
    await option.waitFor({ state: 'visible' });
    await option.tap();
    return this;
  }

  /** Every option of the «Peran» select (a virtual list: scrolled to the end while collecting the rendered options). */
  async roleOptions(): Promise<string[]> {
    const MAX_SCROLLS = 60;
    const SCROLL_STEP_PX = 96;
    await this.roleField.tap();
    await this.browser.locator(ANT.openDropdown).waitFor();
    const options = this.browser.locator(`${ANT.openDropdown} ${ANT.selectOption}`);
    await options.first().waitFor();
    const seen = new Set<string>();
    for (let i = 0; i < MAX_SCROLLS; i++) {
      for (const text of await options.allTextContents()) seen.add(text.trim());
      const atEnd = await this.browser.evaluate(async ({ list, step }: { list: string; step: number }) => {
        const holder = document.querySelector(`${list} .rc-virtual-list-holder`) as HTMLElement | null;
        if (!holder) return true;
        const before = holder.scrollTop;
        holder.scrollTop = before + step;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))));
        return holder.scrollTop === before;
      }, { list: ANT.openDropdown, step: SCROLL_STEP_PX });
      if (atEnd) break;
    }
    return [...seen];
  }

  /** Saves the edit and returns the admin API status. Super Admin changes require a confirmation dialog. */
  async saveChanges(confirmation?: { email: string; reason: string }): Promise<number> {
    const responsePattern = /\/api\/v1\/admin\/admins\/[^/?]+(?:\/[^?]+)?(?:\?|$)/;
    const directResponse = this.browser.waitForResponse(responsePattern);
    await this.saveChangesButton.tap();

    const transferDialogOpened = await this.transferDialog.waitFor({ state: 'visible', timeout: 1000 })
      .then(() => true)
      .catch(() => false);
    if (!transferDialogOpened) return (await directResponse).status;

    // The first response waiter is only for the normal save path. It cannot resolve
    // while the confirmation dialog is open, so consume its timeout safely.
    void directResponse.catch(() => undefined);
    if (!confirmation) throw new Error('Saving a Super Admin role requires confirmation e-mail and reason');
    await this.typeConfirmationEmail(confirmation.email);
    await this.typeReason(confirmation.reason);
    const [response] = await Promise.all([
      this.browser.waitForResponse(responsePattern),
      this.confirmTransferButton.tap(),
    ]);
    return response.status;
  }

  async cancelTransfer(): Promise<this> { await this.transferDialog.getByRole('button', { name: 'Batal' }).tap(); return this; }
}
