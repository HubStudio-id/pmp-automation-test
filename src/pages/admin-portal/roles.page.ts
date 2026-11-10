import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export class RolesPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/user-management/roles`); }
  async openEditor(roleSlug: string): Promise<RoleEditorPage> {
    const url = `${urls.admin}/user-management/roles/${roleSlug}/edit?portal=admin`;
    const editor = new RoleEditorPage(this.f);
    // Role permissions are loaded by a second API request. Retry once when the SPA shell rendered but the editor
    // payload did not arrive in time on staging.
    for (let attempt = 0; attempt < 2; attempt++) {
      await this.app.open(url);
      const loaded = await editor.alwaysOnPagesNote.waitFor({ timeout: 15_000 }).then(() => true, () => false);
      if (loaded) return editor;
    }
    await editor.alwaysOnPagesNote.waitFor({ timeout: 1_000 });
    return editor;
  }
}

export class RoleEditorPage extends AdminShell {
  get alwaysOnPagesNote() { return this.screen.getByText(/Profil & Keamanan Akun, Help Desk, dan Notifikasi selalu aktif/); }
  get oldAccountPageName() { return this.screen.getByText('Pengaturan akun', { exact: true }); }
}
