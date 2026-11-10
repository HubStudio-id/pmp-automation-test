// Data set-up / clean-up by tag. Registered from hooks.ts (registerFixtureHooks) so the order stays fixed:
// Before: session first, then these; After: evidence first, then these, then the context closes.
//   @empty-cart         empty the member cart before and after   @restore-stock     make the V00003 QA SKU available
//   @unlock-lockable    unlock qa+lock@ before and after
//   @archive-invited    archive vendors the scenario invited
//   @archived-admin     archive qa+auto-archive@ before (so its log row is restorable), restore it after
//   @restore-template   if TPL-01's refused upload was stored anyway, upload the original file back as the active version
//   @wizard-baseline    remove the baseline document file of the wizard draft before (so VREG-01 uploads it every
//                       run); upload it back after when the scenario did not
import { Before, After } from '@cucumber/cucumber';
import type { Browser, BrowserContext } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { RegressionWorld } from './world';
import { fixturesFor, type Fixtures } from './adapter';
import { mergedState, statePath } from './auth-state';
import { data, urls } from '../testdata';
import { CartPage, VendorProductsPage, AdminDetailPage } from '../pages';
import { adminRequest, adminUploadTemplateVersion } from '../utils/admin-api';
import { vendorGet, vendorRequest } from '../utils/vendor-api';
import { freeVersionLabel } from '../utils/docx';
import { retryStaticAssets } from './static-assets';

const DRAFT_DOCUMENTS = '/vendor/registration-draft/required-documents';
const BASELINE = data.vendorWizard.baselineDocument as { ruleSlug: string; name: string };

/** The baseline document row of the wizard draft, read from the API. */
async function baselineDocument(world: RegressionWorld): Promise<any> {
  const response = await vendorGet(world.f.browser, DRAFT_DOCUMENTS);
  // A fresh draft has no document list until its first steps are saved (422): every document is missing already.
  if (response.status === 422) return { submission: null, freshDraft: true };
  if (response.status !== 200) throw new Error(`fixture: reading the wizard draft documents answered ${response.status}`);
  const row = (response.body?.data?.document_categories ?? []).flatMap((c: any) => c.documents ?? []).find((d: any) => d.rule_slug === BASELINE.ruleSlug);
  if (!row) throw new Error(`fixture: the wizard draft has no «${BASELINE.name}» row (${BASELINE.ruleSlug})`);
  return row;
}
const baselineFiles = (row: any): { reference: string }[] => row.submission?.files ?? [];

async function uploadBaselineDocument(world: RegressionWorld): Promise<number> {
  const file = data.vendorWizard.dummyDocument as string;
  const upload = { name: basename(file), content_type: 'application/pdf', data: readFileSync(file).toString('base64') };
  const response = await vendorRequest(world.f.browser, 'POST', `${DRAFT_DOCUMENTS}/${BASELINE.ruleSlug}/files`, { files: [upload], metadata: {} });
  return response.status;
}

const CLEANUP_ROLE = 'admin-super';
// Admin «Nonaktifkan & arsipkan» = POST /admin/admins/<slug>/deactivate {reason}; «Pulihkan Akun» = …/restore.
const ARCHIVABLE_ADMIN = `/admin/admins/${data.admin.archivableAdminSlug}`;

async function emptyCart(world: RegressionWorld) {
  try {
    await (await new CartPage(world.f).openFromHeader()).removeAllLines();
  } catch (error) {
    const detail = `URL: ${world.page.url()}\nLast requests:\n${world.apiLog.slice(-25).join('\n')}`;
    throw new Error(`fixture: emptying the member cart failed: ${(error as Error).message}\n${detail}`, { cause: error });
  }
}
async function restoreStock(world: RegressionWorld) {
  await (await new VendorProductsPage(world.f).open()).ensureAvailableInList(data.stockFlag.productName);
}
async function unlockLockable(world: RegressionWorld) {
  const page = await new AdminDetailPage(world.f).open(data.admin.lockableAdminSlug);
  await page.unlockIfLocked(data.admin.lockableAdminSlug);
}

/** Runs admin teardown on the scenario page, or on a short-lived Super Admin context when that page is gone. */
async function withAdminFixtures(world: RegressionWorld, browser: Browser, action: (fixtures: Fixtures) => Promise<void>) {
  const pageIsUsable = world.page && !world.page.isClosed() && world.context?.browser()?.isConnected();
  let context: BrowserContext | undefined;
  let fixtures = world.f;
  if (!pageIsUsable) {
    if (!existsSync(statePath(CLEANUP_ROLE))) throw new Error(`clean-up needs the saved session ${CLEANUP_ROLE}: run «npm run bdd:auth» first`);
    context = await browser.newContext({ storageState: mergedState([CLEANUP_ROLE]), viewport: { width: 1280, height: 720 } });
    await retryStaticAssets(context);
    fixtures = fixturesFor(await context.newPage());
  }
  try {
    await fixtures.app.open(`${urls.admin}/`);
    await action(fixtures);
  } finally {
    await context?.close();
  }
}

export function registerFixtureHooks(getBrowser: () => Browser) {
  Before({ tags: '@empty-cart' }, async function (this: RegressionWorld) { await emptyCart(this); });
  Before({ tags: '@restore-stock' }, async function (this: RegressionWorld) { await restoreStock(this); });
  Before({ tags: '@unlock-lockable' }, async function (this: RegressionWorld) { await unlockLockable(this); });
  Before({ tags: '@archived-admin' }, async function (this: RegressionWorld) {
    await this.f.app.open(`${urls.admin}/`);
    const found = await adminRequest(this.f.browser, 'GET', ARCHIVABLE_ADMIN);
    if (found.status !== 200) {
      throw new Error(`fixture: ${data.admin.archivableAdminEmail} (slug ${data.admin.archivableAdminSlug}) answered ${found.status}; the lead creates it with «npm run bdd:accounts»`);
    }
    const archived = await adminRequest(this.f.browser, 'POST', `${ARCHIVABLE_ADMIN}/deactivate`, { reason: data.admin.archiveReason });
    if (archived.status !== 200) throw new Error(`fixture: archiving ${data.admin.archivableAdminEmail} answered ${archived.status}`);
    this.cleanup.archivedAdmin = true;
  });
  Before({ tags: '@wizard-baseline' }, async function (this: RegressionWorld) {
    await this.f.app.open(`${urls.vendor}/registration`);
    for (const file of baselineFiles(await baselineDocument(this))) {
      const removed = await vendorRequest(this.f.browser, 'DELETE', `${DRAFT_DOCUMENTS}/${BASELINE.ruleSlug}/files/${encodeURIComponent(file.reference)}`);
      if (![200, 204].includes(removed.status)) throw new Error(`fixture: removing the «${BASELINE.name}» file answered ${removed.status}`);
    }
    const after = await baselineDocument(this);
    if (after.freshDraft) return;
    if (baselineFiles(after).length) throw new Error(`fixture: «${BASELINE.name}» still has a file after the removal`);
    this.cleanup.wizardBaselineRemoved = true;
  });

  After({ tags: '@archived-admin' }, async function (this: RegressionWorld) {
    // Nothing to restore when set-up failed; this also keeps a set-up 404 from being hidden by a second error.
    if (!this.cleanup.archivedAdmin) return;
    await withAdminFixtures(this, getBrowser(), async (fixtures) => {
      const restored = await adminRequest(fixtures.browser, 'POST', `${ARCHIVABLE_ADMIN}/restore`, {});
      if (restored.status !== 200) throw new Error(`fixture: restoring ${data.admin.archivableAdminEmail} answered ${restored.status}`);
    });
  });
  After({ tags: '@wizard-baseline' }, async function (this: RegressionWorld) {
    // Leave the draft complete for the next run: upload the file back only when the scenario stopped before doing it.
    if (!this.cleanup.wizardBaselineRemoved) return;
    await this.f.app.open(`${urls.vendor}/registration`);
    if (baselineFiles(await baselineDocument(this)).length) return;
    const status = await uploadBaselineDocument(this);
    if (![200, 201].includes(status)) throw new Error(`fixture: uploading «${BASELINE.name}» back answered ${status}`);
  });
  After({ tags: '@restore-template' }, async function (this: RegressionWorld) {
    const before = this.cleanup.templateToRestore;
    if (!before) return;
    await withAdminFixtures(this, getBrowser(), async (fixtures) => {
      const versions = (await adminRequest(fixtures.browser, 'GET', `/admin/document-templates/${before.slug}`)).body?.data?.versions ?? [];
      if (versions.find((v: any) => v.status === 'active')?.version_label === before.activeLabel) return;
      // A label already in the history makes the upload fail and leaves the test version active (seen 10 Nov 2026, 15.28).
      const label = freeVersionLabel(versions.map((v: any) => v.version_label));
      const status = await adminUploadTemplateVersion(fixtures.browser, before.slug, before.originalBase64, `${before.slug}-restore.docx`, label, `QA regression TPL-01 restore of ${before.activeLabel}`);
      if (![200, 201].includes(status)) throw new Error(`fixture: restoring ${before.slug} ${before.activeLabel} answered ${status}`);
    });
  });
  After({ tags: '@archive-invited' }, async function (this: RegressionWorld) {
    if (!this.cleanup.invitedVendorSlugs.length) return;
    await withAdminFixtures(this, getBrowser(), async (fixtures) => {
      for (const slug of this.cleanup.invitedVendorSlugs) {
        const archived = await adminRequest(fixtures.browser, 'POST', `/vendors/${slug}/archive`, { reason: 'QA regression VREG-04 teardown' });
        if (archived.status !== 200) throw new Error(`fixture: archiving invited vendor ${slug} answered ${archived.status}`);
      }
    });
  });
  After({ tags: '@unlock-lockable' }, async function (this: RegressionWorld) { await unlockLockable(this); });
  After({ tags: '@restore-stock' }, async function (this: RegressionWorld) { await restoreStock(this); });
  After({ tags: '@empty-cart' }, async function (this: RegressionWorld) { await emptyCart(this); });
}
