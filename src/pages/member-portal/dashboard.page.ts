import { urls } from '../../testdata';
import { MemberShell } from './member-shell.page';

export class MemberDashboardPage extends MemberShell {
  async open(): Promise<this> { return this.openUrl(`${urls.member}/dashboard`); }
}
