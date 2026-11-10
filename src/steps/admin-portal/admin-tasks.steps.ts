// Admin · Transaksi › Tugas Admin (SLA-01, PMP-673 TC-1.2: the invoice escalation appears for a non-full-access
// Admin viewer and names «SLA Terlampaui»).
import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '../../support/bdd-expect';
import type { RegressionWorld } from '../../support/world';
import { AdminTasksPage } from '../../pages';
import { data, urls } from '../../testdata';
import { adminRequest } from '../../utils/admin-api';

Given('an open invoice-creation task that breached its SLA exists for this admin', async function (this: RegressionWorld) {
  const { slaCode, breachedTitle } = data.adminTasks;
  await this.f.app.open(`${urls.admin}/`);
  const tasks = await adminRequest(this.f.browser, 'GET', `/admin/tasks?q=${slaCode}&per_page=50`);
  expect(tasks.status, 'this admin can read Tugas Admin').toBe(200);
  const task = (tasks.body?.data ?? []).find((t: any) => t.sla_code === slaCode && t.status === 'open' && t.title === breachedTitle);
  expect(task, `precondition: an open ${slaCode} task titled «${breachedTitle}» exists (none would make the check empty)`).toBeDefined();
  this.stash.task = { slug: task.slug, reference: task.reference_number, trigger: task.trigger_text };
});
When('Tugas Admin is searched for that task', async function (this: RegressionWorld) {
  this.stash.tasks = await (await new AdminTasksPage(this.f).open()).search(this.stash.task.reference);
});
Then('its row reads «SLA Terlampaui» for the vendor invoice', async function (this: RegressionWorld) {
  const row = this.stash.tasks.taskRow(this.stash.task.reference);
  await expect(row).toContainText(data.adminTasks.breachedTitle);
  await expect(row).toContainText(data.adminTasks.invoiceStage);
});
When('the task is opened with «Buka»', async function (this: RegressionWorld) {
  await this.stash.tasks.openTask(this.stash.task.reference);
  expect(await this.f.browser.url(), 'the detail page of that task').toContain(`/admin/tasks/${this.stash.task.slug}`);
});
Then('the task detail names «SLA Terlampaui» and the reference, without «Akses Ditolak»', async function (this: RegressionWorld) {
  const detail = this.stash.tasks.detail;
  await expect(detail).toContainText(data.adminTasks.breachedTitle);
  await expect(detail).toContainText(this.stash.task.reference);
  await expect(this.stash.tasks.accessDeniedMessage).toHaveCount(0);
});
