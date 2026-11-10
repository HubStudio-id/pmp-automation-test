import { expect as playwrightExpect } from '@playwright/test';

type BddExpect = {
  (actual: any, message?: string): any;
  arrayContaining: typeof playwrightExpect.arrayContaining;
};

// Playwright's expect, loosely typed so steps can assert on values kept in the World's untyped stash.
export const expect = Object.assign(
  (actual: any, message?: string) => playwrightExpect(actual, message),
  { arrayContaining: playwrightExpect.arrayContaining },
) as BddExpect;
