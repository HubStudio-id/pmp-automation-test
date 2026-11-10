// Parts shared by every Admin page: sidebar and header account menu.
import { BasePage } from '../base.page';
import { LoginPage } from '../login.page';

export class AdminShell extends BasePage {
  get sidebarRolesLink() { return this.screen.getByRole('link', { name: 'Peran', exact: true }); }
  get sidebarSettingsGroup() { return this.screen.getByText('PENGATURAN', { exact: true }); }

  /** Opens the header account menu of the signed-in admin (shown by display name) and signs out. */
  async signOut(displayName: string): Promise<LoginPage> {
    await this.screen.getByText(displayName, { exact: true }).first().tap();
    await this.screen.getByRole('button', { name: 'Keluar', exact: true }).tap();
    await this.browser.waitForURL(/\/login/);
    return new LoginPage(this.f, 'admin');
  }
}
