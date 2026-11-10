import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export class AdminNegotiationPage extends AdminShell {
  async open(code: string): Promise<this> { return this.openUrl(`${urls.admin}/catalog/negotiations/${code}`); }
  summaryLine(code: string) { return this.screen.getByText(new RegExp(`${code} · `)).first(); }
}
