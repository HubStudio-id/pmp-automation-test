import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export class AdminNegotiationPage extends AdminShell {
  async open(code: string): Promise<this> {
    const url = `${urls.admin}/catalog/negotiations/${code}`;
    // The Admin SPA occasionally mounts before its detail request completes. Retry the navigation once so a
    // transient staging/API response does not turn a valid cross-portal case into a false locator failure.
    for (let attempt = 0; attempt < 2; attempt++) {
      await this.openUrl(url);
      const loaded = await this.summaryLine(code).waitFor({ timeout: 15_000 }).then(() => true, () => false);
      if (loaded) return this;
    }
    await this.summaryLine(code).waitFor({ timeout: 1_000 });
    return this;
  }
  summaryLine(code: string) { return this.screen.getByText(new RegExp(`${code} · `)).first(); }
}
