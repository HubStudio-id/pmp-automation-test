// Base for every page object. Page objects hold locators and actions only — no assertions.
import type { Locator, Page } from 'playwright';

/** Opens a URL in the scenario's page; screenshot() captures it. */
export type App = { open(url: string): Promise<void>; screenshot(): Promise<Buffer> };

/** A response read by browser.waitForResponse: status, url and headers are values; json()/text() read the body. */
export type ResponseInfo = { url: string; status: number; headers: Record<string, string>; json(): Promise<any>; text(): Promise<string> };

/** Page-level helpers the page objects use besides locators (see support/adapter.ts). */
export type Browser = {
  waitForResponse(pattern: RegExp | string, options?: { timeout?: number }): Promise<ResponseInfo>;
  waitForURL(url: RegExp | string, options?: { timeout?: number }): Promise<void>;
  evaluate<R, A = unknown>(fn: (arg: A) => R | Promise<R>, arg?: A): Promise<R>;
  locator(selector: string): Locator;
  url(): Promise<string>;
};

export type Fixtures = { app: App; screen: Page; browser: Browser };

/**
 * Ant Design structure that roles and labels do not expose (data rows vs. the measure row, pager items, the open
 * dropdown). Every CSS selector on the UI kit lives here, so an Ant Design upgrade is fixed in one place.
 */
export const ANT = {
  tableRow: 'tbody tr.ant-table-row',
  pagerItem: 'li.ant-pagination-item',
  openDropdown: '.ant-select-dropdown:not(.ant-select-dropdown-hidden)',
  /** An open popover or dropdown overlay (e.g. the Member notification bell panel, which has no ARIA role). */
  openOverlay: '.ant-popover:not(.ant-popover-hidden), .ant-dropdown:not(.ant-dropdown-hidden)',
  selectOption: '.ant-select-item-option',
  /** A select's visible value box; append `:has(input[aria-label="<label>"])` to pick the field. */
  selectValue: '.ant-select-content',
  /** A select that already shows a chosen value. */
  filledSelect: '.ant-select:has(.ant-select-input)',
} as const;

export abstract class BasePage {
  constructor(protected readonly f: Fixtures) {}

  protected get screen() { return this.f.screen; }
  protected get app() { return this.f.app; }
  protected get browser() { return this.f.browser; }

  /** Opens an absolute URL and returns this page for chaining. */
  protected async openUrl(url: string): Promise<this> {
    await this.app.open(url);
    return this;
  }

  heading(name: string | RegExp) { return this.screen.getByRole('heading', { name, exact: typeof name === 'string' }); }
  text(value: string | RegExp, exact = typeof value === 'string') { return this.screen.getByText(value, { exact }); }
  /** Waits until a data table has finished loading: the «Memuat data» placeholder is gone and a body row (data or empty state) exists. */
  async waitForTableLoaded(): Promise<this> {
    await this.screen.getByText(/^Memuat data/).waitFor({ state: 'hidden' });
    await this.screen.getByRole('row').nth(1).waitFor();
    return this;
  }

  /** Data rows of the table on screen (Ant Design table rows, without the hidden measure row). */
  get tableRows() { return this.browser.locator(ANT.tableRow); }
  /** Last numbered page button of the pager. */
  get lastPagerItem() { return this.browser.locator(ANT.pagerItem).last(); }

  get accessDeniedMessage() { return this.screen.getByText(/Akses Ditolak|Anda tidak memiliki akses ke halaman ini/); }
}
