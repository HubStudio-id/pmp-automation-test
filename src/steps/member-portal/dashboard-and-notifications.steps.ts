// Member · dashboard, account menu (AUTH-05), notification bell and Notifikasi page (NOTIF-01).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { MemberDashboardPage, MemberNotificationsPage } from '../../pages';
import { memberGet } from '../../utils/member-api';

const SCREEN_HEIGHT = 812;
const MAX_PANEL_ROWS = 6;
const NOTIFICATION_CATEGORIES = ['Pesanan', 'Pengiriman', 'Penagihan', 'Rekanan', 'Akun'];

Given('the Member dashboard is open', async function (this: RegressionWorld) {
  this.stash.memberDashboard = await new MemberDashboardPage(this.f).open();
});

When('the member opens the account menu', async function (this: RegressionWorld) {
  const dashboard = this.stash.memberDashboard ?? await new MemberDashboardPage(this.f).open();
  await dashboard.openAccountMenu();
  this.stash.memberDashboard = dashboard;
});
Given('the screen is {int} px wide', async function (this: RegressionWorld, width: number) {
  await this.page.setViewportSize({ width, height: SCREEN_HEIGHT });
});
// PMP-729 AC1: the menu opens inside the viewport. «Visible» alone also passes for an item drawn off-screen, so each
// item must lie entirely inside the viewport (ratio 1).
Then('{string}, {string} and {string} lie entirely inside the screen', async function (this: RegressionWorld, a: string, b: string, c: string) {
  for (const item of [a, b, c]) {
    const menuItem = this.stash.memberDashboard.accountMenuItem(new RegExp(item));
    await expect(menuItem).toBeVisible();
    await expect(menuItem, `«${item}» inside the viewport`).toBeInViewport({ ratio: 1 });
  }
});

When('the member opens the notification bell', async function (this: RegressionWorld) {
  const dashboard = this.stash.memberDashboard ?? await new MemberDashboardPage(this.f).open();
  await dashboard.openNotificationBell();
  this.stash.memberDashboard = dashboard;
});
// PMP-746 TC-1.2: the bell shows the unread count and at most the six newest notifications.
Then('the panel shows the unread count from the API and between 1 and 6 notifications', async function (this: RegressionWorld) {
  const panel = this.stash.memberDashboard.notificationPanel;
  await expect(panel).toBeVisible();
  const unread = await memberGet(this.f.browser, '/member/notifications/unread-count');
  expect(unread.status).toBe(200);
  await expect(panel, `the panel names the API unread count (${unread.body?.unread_count})`).toContainText(`${unread.body?.unread_count} baru`);
  const rows = await this.stash.memberDashboard.notificationPanelRows.count();
  expect(rows, 'precondition: the member has notifications').toBeGreaterThan(0);
  expect(rows, 'at most the six newest').toBeLessThanOrEqual(MAX_PANEL_ROWS);
});
When('the member opens the Notifikasi page', async function (this: RegressionWorld) {
  this.stash.notifications = await new MemberNotificationsPage(this.f).open();
  await expect(this.stash.notifications.pageHeading).toBeVisible();
});
Then('every notification category shows a count', async function (this: RegressionWorld) {
  for (const category of NOTIFICATION_CATEGORIES) await expect(this.stash.notifications.categoryWithCount(category)).toBeVisible();
});
Then('at least one notification is listed', async function (this: RegressionWorld) {
  await expect(this.stash.notifications.firstNotification).toBeVisible();
});
