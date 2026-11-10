// Sign-in page of the three portals. Submitting waits for the login API response and returns its HTTP status,
// so the caller (a setup test) asserts the sign-in worked instead of timing out on a URL.
import { BasePage, type Fixtures } from './base.page';
import { urls } from '../testdata';

const FORM = {
  admin: { url: () => `${urls.admin}/login`, api: /\/api\/v1\/admin\/auth\/login$/, email: 'Email', password: 'Kata Sandi', submit: 'Masuk ke Platform' },
  member: { url: () => `${urls.member}/login`, api: /\/api\/v1\/member\/auth\/login$/, email: 'Email', password: 'Kata sandi', submit: 'Masuk ke Platform' },
  vendor: { url: () => `${urls.vendor}/login`, api: /\/api\/v1\/(vendor\/)?auth\/login$/, email: 'Email vendor', password: 'Kata sandi', submit: 'Masuk ke Portal Vendor' },
} as const;

export type Portal = keyof typeof FORM;

export class LoginPage extends BasePage {
  constructor(f: Fixtures, private readonly portal: Portal) { super(f); }

  private get form() { return FORM[this.portal]; }
  get emailField() { return this.screen.getByLabel(this.form.email); }
  get passwordField() { return this.screen.getByLabel(this.form.password); }
  get rememberMeCheckbox() { return this.screen.getByLabel('Ingat saya'); }
  get submitButton() { return this.screen.getByRole('button', { name: this.form.submit }); }
  get passkeyButton() { return this.screen.getByRole('button', { name: 'Masuk dengan passkey' }); }
  get errorAlert() { return this.screen.getByRole('alert').first(); }

  async open(): Promise<this> { return this.openUrl(this.form.url()); }

  async enterEmail(email: string): Promise<this> {
    await this.emailField.fill(email);
    return this;
  }

  async setRememberMe(remember: boolean): Promise<this> {
    if ((await this.rememberMeCheckbox.isChecked()) !== remember) {
      await (remember ? this.rememberMeCheckbox.check() : this.rememberMeCheckbox.uncheck());
    }
    return this;
  }

  async startPasskeySignIn(): Promise<this> {
    await this.passkeyButton.tap();
    return this;
  }

  /** Opens the form, submits e-mail + password and returns the login API status (200 = signed in). */
  async submitCredentials(email: string, password: string, rememberMe?: boolean): Promise<number> {
    await this.open();
    await this.enterEmail(email);
    await this.passwordField.fill(password);
    if (rememberMe !== undefined) await this.setRememberMe(rememberMe);
    const [response] = await Promise.all([this.browser.waitForResponse(this.form.api), this.submitButton.tap()]);
    return response.status;
  }

  /** Signs in; returns the login API status and, on success, waits until the portal has left /login. */
  async signInAs(user: { username: string; password: string }, options: { rememberMe?: boolean } = {}): Promise<number> {
    const status = await this.submitCredentials(user.username, user.password, options.rememberMe);
    if (status === 200) await this.browser.waitForURL(/^(?!.*\/login).*$/);
    return status;
  }
}
