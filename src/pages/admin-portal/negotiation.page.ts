import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export class AdminNegotiationPage extends AdminShell {
  async open(code: string): Promise<this> {
    await this.openUrl(`${urls.admin}/catalog/negotiations/${code}`);
    // The Admin SPA can finish navigation before the negotiation API response has rendered the summary.
    await this.summaryLine(code).waitFor({ timeout: 30_000 });
    return this;
  }
  summaryLine(code: string) { return this.screen.getByText(new RegExp(`${code} · `)).first(); }
}
