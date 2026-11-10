// Member · Bantuan › Help Desk: «Login gagal» guide (AUTH-04).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { MemberHelpDeskPage } from '../../pages';

Given('the Member Help Desk is open', async function (this: RegressionWorld) {
  this.stash.helpDesk = await new MemberHelpDeskPage(this.f).open();
});
When('the member searches Help Desk for {string}', async function (this: RegressionWorld, query: string) {
  await this.stash.helpDesk.search(query);
});
Then('at least one Help Desk topic is found', async function (this: RegressionWorld) {
  await expect(this.stash.helpDesk.resultCount).toBeVisible();
});
Then('the Help Desk topic {string} is listed', async function (this: RegressionWorld, title: string) {
  await expect(this.stash.helpDesk.topicLink(new RegExp(`^${title}`))).toBeVisible();
});
