import { urls } from '../../testdata';
import { AdminShell } from './admin-shell.page';

/** Master › Member, with the «Undang faskes» dialog. Never sends an invitation. */
export class AdminMembersPage extends AdminShell {
  async open(): Promise<this> { return this.openUrl(`${urls.admin}/members`); }
  get facilityTypeFilter() { return this.screen.getByRole('combobox', { name: 'Jenis faskes' }); }
  get inviteDialog() { return this.screen.getByRole('dialog'); }
  async openInviteFacilityDialog(): Promise<this> { await this.screen.getByRole('button', { name: 'Undang faskes' }).tap(); return this; }
  async closeInviteDialog(): Promise<this> { await this.inviteDialog.getByRole('button', { name: /Batal|Tutup/ }).first().tap(); return this; }
}
