import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export class AdminDashboardPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/`); }
  block(title: string) { return this.screen.getByText(title).first(); }
  get customizeWidgetsButton() { return this.screen.getByText('Atur widget'); }
}
