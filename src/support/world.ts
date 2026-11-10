// Per-scenario state: one Playwright context (with the scenario's saved sessions), its page, and the
// { app, screen, browser } fixtures the page objects expect.
import { World, setWorldConstructor, setDefaultTimeout, type IWorldOptions } from '@cucumber/cucumber';
import type { BrowserContext, Page } from 'playwright';
import { type Fixtures } from './adapter';

setDefaultTimeout(120_000);

export type StashKey =
  | 'legalCounts'
  | 'pastContract'
  | 'task'
  | 'sessionTokens'
  | 'roleOptions'
  | 'todayLine'
  | 'save'
  | 'wizardData'
  | 'upload'
  | 'changedDocx'
  | 'usedLabels'
  | 'template'
  | 'newHna'
  | 'priceBefore'
  | 'templateVersions'
  | 'messagePosts'
  | 'sendStatus'
  | 'sentFile'
  | 'room'
  | 'templates'
  | 'attachmentUrl'
  | 'account'
  | 'accountGuide'
  | 'activation'
  | 'activationStatus'
  | 'adminDetail'
  | 'adminNegotiation'
  | 'agreement'
  | 'apiTotal'
  | 'archive'
  | 'attempts'
  | 'axCode'
  | 'cart'
  | 'catalog'
  | 'consentStatuses'
  | 'consentTypes'
  | 'contracts'
  | 'dashboard'
  | 'documents'
  | 'draftStatus'
  | 'feeLetter'
  | 'groupShowedNoCito'
  | 'helpDesk'
  | 'incomplete'
  | 'invitationLink'
  | 'inviteStatus'
  | 'invoiceNumber'
  | 'issueStatus'
  | 'layout'
  | 'letter'
  | 'limits'
  | 'list'
  | 'lockable'
  | 'log'
  | 'login'
  | 'memberDashboard'
  | 'members'
  | 'negotiationCode'
  | 'newPassword'
  | 'newSignInStatus'
  | 'notifications'
  | 'products'
  | 'reachedStep'
  | 'registrations'
  | 'roleEditor'
  | 'saveDisabledBeforeCondition'
  | 'saveStatus'
  | 'saved'
  | 'sentAt'
  | 'servedSlaShown'
  | 'tasks'
  | 'vendorContracts'
  | 'vendorEmail'
  | 'vendorProducts'
  | 'uploads'
  | 'versionAfter'
  | 'versionBefore'
  | 'wizard';

export class RegressionWorld extends World {
  context!: BrowserContext;
  page!: Page;
  f!: Fixtures;
  /**
   * Values a scenario hands from one step to the next (codes, names, statuses, open page objects). Keys are listed in
   * StashKey so a misspelt key is a type error instead of a silent «undefined»; add the key there when a step needs one.
   */
  stash: Partial<Record<StashKey, any>> = {};
  /** Last API answers of the scenario («ms status METHOD /path», no query, headers or bodies) for clean-up errors. */
  apiLog: string[] = [];
  /** True when this scenario records a Playwright trace (kept only if it fails). */
  tracing = false;
  /** Records the scenario created that the After hooks must clean up. */
  cleanup: {
    invitedVendorSlugs: string[];
    /** True only after @archived-admin successfully archived its fixture. */
    archivedAdmin: boolean;
    /** True after @wizard-baseline removed the baseline document file of the wizard draft. */
    wizardBaselineRemoved: boolean;
    /** Set by TPL-01: the template and its active version before the upload, for @restore-template. */
    templateToRestore?: { slug: string; name: string; activeLabel: string; originalBase64: string };
  } = { invitedVendorSlugs: [], archivedAdmin: false, wizardBaselineRemoved: false };

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(RegressionWorld);
