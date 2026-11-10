import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

export class RolesPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/user-management/roles`); }
  async openEditor(roleSlug: string): Promise<RoleEditorPage> {
    await this.app.open(`${urls.admin}/user-management/roles/${roleSlug}/edit?portal=admin`);
    return new RoleEditorPage(this.f);
  }
}

export class RoleEditorPage extends AdminShell {
  get alwaysOnPagesNote() { return this.screen.getByText(/Profil & Keamanan Akun, Help Desk, dan Notifikasi selalu aktif/); }
  get oldAccountPageName() { return this.screen.getByText('Pengaturan akun', { exact: true }); }
}
