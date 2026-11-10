// Parts shared by every Vendor page: collapsible sidebar groups and the header account menu.
import { BasePage } from '../base.page';
import { LoginPage } from '../login.page';

export class VendorShell extends BasePage {
  async openSidebarItem(group: string, link: string): Promise<this> {
    await this.screen.getByRole('button', { name: group }).tap();
    await this.screen.getByRole('link', { name: link }).tap();
    return this;
  }

  /** The account button shows the company initials (e.g. «QA»). */
  async signOut(avatarInitials: string): Promise<LoginPage> {
    await this.screen.getByRole('button', { name: avatarInitials, exact: true }).tap();
    await this.screen.getByRole('menuitem', { name: /Logout/ }).tap();
    await this.browser.waitForURL(/\/login/);
    return new LoginPage(this.f, 'vendor');
  }
}
