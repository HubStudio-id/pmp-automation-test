// Cucumber (BDD) runner for the PMP regression features. Run through the npm scripts (they prepare sessions first):
//   npm run bdd:all       full run (tools/run-bdd-phases.mjs): sessions once, main set ‖ lockout, then sign-in form
//   npm run bdd           main set (P1 + P2), parallel BDD_WORKERS (default 5), without the scenarios that sign in themselves
//   npm run bdd:p1        P1 sanity only (main P1 in parallel, then the P1 sign-in form scenarios)
//   npm run bdd:sign-in   scenarios that sign in through the form (@sign-in-form)
//   npm run bdd:lockout   AUTH-06 (five wrong passwords)
//   npm run bdd:admin-portal | bdd:vendor-portal | bdd:member-portal   main set of one portal folder
//   npm run bdd:report    build and open the Allure report (Allure 3, no Java needed)
// Each profile writes its own cucumber report, so phases that run at the same time never overwrite each other.
// BDD_PLAIN=1 (set by the phase runner) swaps the progress bar for plain progress, which stays readable when two
// phases print at once.
const workers = Number(process.env.BDD_WORKERS ?? 5);
const reportKind = process.env.REPORT_KIND === 'smoke' ? 'smoke' : 'regression';
const reportRoot = `reports/pmp-${reportKind}`;
const formats = (name) => [
  process.env.BDD_PLAIN === '1' ? 'progress' : 'progress-bar',
  `html:${reportRoot}/cucumber/report-${name}.html`,
  `json:${reportRoot}/cucumber/report-${name}.json`,
  'summary',
  'allure-cucumberjs/reporter',
];
const common = {
  paths: ['src/features/**/*.feature'],
  import: ['src/support/**/*.ts', 'src/steps/**/*.ts'],
  // Allure results and Cucumber files stay under the selected suite folder; «npm run bdd:report» builds and opens it.
  // Clear old results with «npm run bdd:report:clear» before a new regression cycle.
  formatOptions: {
    snippetInterface: 'async-await',
    resultsDir: `${reportRoot}/allure-results`,
    labels: [
      // «@priority:P1» → label value «P1» (the reporter keeps the tag text after «@xxx:»).
      { pattern: [/^@priority:(P1|P2)$/], name: 'priority' },
      { pattern: [/@(REG-[A-Z]+-\d+)$/], name: 'regression-case' },
      // Allure's own severity (blocker · critical · normal · minor · trivial): the reporter keeps the text after
      // «@severity:», so the label value is the plain level. Every feature carries one tag (see REGRESSION-PLAN.md).
      { pattern: [/^@severity:(blocker|critical|normal|minor|trivial)$/], name: 'severity' },
    ],
  },
  retry: 0,
};

// Every scenario is automated and runs in bdd:all; there is no lead-only set. BDD_EXCLUDE drops tags from every
// profile for one run, e.g. BDD_EXCLUDE='@sa-grant' when an AI agent runs the suite (its guardrail forbids the Super
// Admin grant attempt of ROLE-09).
const exclude = (tags) => (process.env.BDD_EXCLUDE ? `(${tags}) and not (${process.env.BDD_EXCLUDE.split(',').join(' or ')})` : tags);
// Scenarios that sign in themselves (@sign-in-form, @account-create, @sign-in-lockout) are kept out of the parallel set.
const MAIN = 'not @sign-in-form and not @sign-in-lockout and not @account-create';
const SIGN_IN = '@sign-in-form or @account-create';

export default { ...common, format: formats('main'), tags: exclude(MAIN), parallel: workers };

// Scenarios that sign in themselves run one at a time: the sign-in ledger file is not shared safely between workers.
export const p1 = { ...common, format: formats('p1'), tags: exclude(`@priority:P1 and ${MAIN}`), parallel: workers };
export const p1signin = { ...common, format: formats('p1-sign-in'), tags: exclude(`@priority:P1 and (${SIGN_IN})`), parallel: 1 };
export const signin = { ...common, format: formats('sign-in'), tags: exclude(SIGN_IN), parallel: 1 };
export const lockout = { ...common, format: formats('lockout'), tags: exclude('@sign-in-lockout'), parallel: 1 };

// One portal only (src/features/<portal-portal>/): same filter and workers as the main set. Cross-portal cases sit
// with the portal whose screen gives the final verdict (e.g. CAT-06 in member-portal,
// VREG-04 in vendor-portal).
const portal = (name) => ({ ...common, format: formats(name), paths: [`src/features/${name}/**/*.feature`], tags: exclude(MAIN), parallel: workers });
export const adminPortal = portal('admin-portal');
export const vendorPortal = portal('vendor-portal');
export const memberPortal = portal('member-portal');

// Backward-compatible profile names for existing local commands.
export const admin = adminPortal;
export const vendor = vendorPortal;
export const member = memberPortal;
