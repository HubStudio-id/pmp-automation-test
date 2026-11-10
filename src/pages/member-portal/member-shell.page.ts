// Parts shared by every Member page: header cart button, notification bell, account menu.
import { ANT, BasePage } from '../base.page';
import { LoginPage } from '../login.page';
import type { Locator } from 'playwright';

export class MemberShell extends BasePage {
  get accountMenuButton() { return this.screen.getByRole('button', { name: /^Menu akun / }); }
  accountMenuItem(name: RegExp): Locator { return this.screen.getByRole('menuitem', { name }); }
  /** The bell's panel: the open overlay that carries «Tandai semua dibaca» and «Lihat semua» (it has no ARIA role). */
  get notificationPanel() { return this.browser.locator(ANT.openOverlay).filter({ hasText: 'Lihat semua' }).filter({ hasText: 'Tandai semua dibaca' }); }
  /** Notification rows in the panel (its buttons other than «Tandai semua dibaca» and «Lihat semua»). */
  get notificationPanelRows() { return this.notificationPanel.getByRole('button').filter({ hasNotText: /^(Tandai semua dibaca|Lihat semua)$/ }); }

  async openAccountMenu(): Promise<this> { await this.accountMenuButton.tap(); return this; }
  async openNotificationBell(): Promise<this> { await this.screen.getByRole('button', { name: 'Notifikasi' }).tap(); return this; }

  async signOut(): Promise<LoginPage> {
    await this.openAccountMenu();
    await this.accountMenuItem(/Keluar/).tap();
    await this.browser.waitForURL(/\/login/);
    return new LoginPage(this.f, 'member');
  }
}
