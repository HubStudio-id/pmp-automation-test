import { expect as playwrightExpect } from '@playwright/test';

type BddExpect = {
  (actual: any, message?: string): any;
  arrayContaining: typeof playwrightExpect.arrayContaining;
};

// Playwright's expect, loosely typed so steps can assert on values kept in the World's untyped stash.
const configuredExpect = playwrightExpect.configure({ timeout: 15_000 });

export const expect = Object.assign(
  (actual: any, message?: string) => configuredExpect(actual, message),
  { arrayContaining: configuredExpect.arrayContaining },
) as BddExpect;
