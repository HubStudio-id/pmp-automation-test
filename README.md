# PMP regression (BDD · Cucumber + Playwright)

Staging regression for the Admin / Member / Vendor portals of PMP. **The regression runs in Cucumber (BDD)**:
Gherkin features in `src/features/`, step definitions reusing the page objects in `src/pages`, test data in
`src/testdata`, Allure reports.

## Setup (once)
1. Node ≥ 26.12.1 (`node -v`), then `npm install` and `npx playwright install chromium`.
2. `.env` (mode 600, never committed): fill `QA_PASS_<ROLE>` for the QA accounts you use (empty password = role
   skipped), and the Gmail API values for the invitation e-mails (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, then
   `node tools/gmail-auth.mjs` writes `GMAIL_REFRESH_TOKEN`).

## Allure report

The BDD runner writes all output under `reports/`: Cucumber files in `reports/cucumber/`, Allure results in
`reports/allure-results/`, the generated report in `reports/allure-report/`, and failure traces in `reports/traces/`.
Run lama yang sebelumnya berada di `results/` disimpan sebagai `reports/legacy-results/` dan tidak dipakai oleh runner baru.
Use a clean cycle when you want a report for
one complete run; it clears old results, runs the three rate-limited phases, and still generates the report if a
phase fails:

```bash
npm run bdd:fresh
```

For a single phase, run `npm run bdd`, `npm run bdd:sign-in`, or `npm run bdd:lockout`, then open the current
results with `npm run bdd:report`. The report title is **PMP - Regression Test Report**. `npm run bdd:all` runs
all three phases and returns a failing exit code when any phase fails.

## GitHub Actions

The workflow `.github/workflows/pmp-regression.yml` runs the P1 suite on pull requests and pushes to `main`, and the
full suite on the weekday schedule. It can also be started manually with `p1` or `all`.

Before the first run, add one repository secret named `PMP_ENV_FILE`. Its value is the complete local `.env` file,
including the staging URLs, `QA_USER_*`/`QA_PASS_*` accounts, and read-only Gmail API values used by invitation cases.
Do not commit `.env` or paste its values into the workflow. The CI uploads the Allure and Cucumber reports as a
14-day artifact; Playwright traces are deliberately excluded because they contain session tokens.

## BDD (Cucumber) — same cases, Gherkin format

Feature files in `src/features/<portal>/<area>/<ID>_<what>.feature`, `<portal>` = `admin-portal`, `vendor-portal` or `member-portal`
(tags `@priority:P1`/`@priority:P2`, `@REG-…`, `@severity:<level>`). A case that checks several portals is split into
one file per portal with the same `@REG-…` tag (AUTH-02, AUTH-04, KTR-01, MREG-05). A cross-portal
flow stays one scenario, in the portal whose screen gives the verdict: NEG-01 in `admin`, CAT-06 in
`member`, VREG-04 in `vendor`.
Step definitions in `src/steps/<portal>/` follow the portal of the page they drive; portal-neutral steps (texts,
sign-in page, activation refusal, Help Desk search, letter markers) are in `src/steps/common.steps.ts`. They reuse
the page objects in `src/pages`. Runner: Cucumber +
Playwright (Chromium), reports per phase in `reports/cucumber/report-<phase>.html|json` (main, lockout, sign-in, p1, …) plus Allure.

| Command (VS Code: Terminal › Run Task… › «BDD: …») | Runs |
|---|---|
| `npm run bdd:auth` | prepares saved sessions in `.auth/` (reuses valid ones, signs in max 9 per minute) |
| `npm run bdd:dry` | checks every step has a definition (no browser, no staging) |
| `npm run bdd:check` | runs TypeScript validation and the Cucumber dry-run gate |
| `npm run bdd:p1` | P1 sanity (19 scenarios): sessions once, 16 in parallel, then the 3 P1 sign-in form scenarios |
| `npm run bdd:data-check` | read-only preflight of the staging data the suite needs (contract dates, AX codes, PKS contract, NEG/PO, SKUs); run after `bdd:auth`, before `bdd` |
| `npm run bdd` | main set, 5 parallel workers (`BDD_WORKERS`; excludes the three groups below) |
| `npm run bdd:sign-in` | scenarios that sign in through the form |
| `npm run bdd:lockout` | AUTH-06 |
| `npm run bdd:admin-portal` · `bdd:vendor-portal` · `bdd:member-portal` | main set of one portal folder |
| `npm run bdd:all` | every scenario (no lead-only set): sessions once, then main set and lockout at the same time (lockout output in `reports/cucumber/lockout.log`), then the sign-in phase (sign-in form + VREG-04 account creation); prints each phase's time; exit code of the first failing phase |
| `npm run bdd:fresh` | clears old Allure results, runs all phases, then opens the report |
| `npm run typecheck` | validates TypeScript without running staging tests |

Tags: `@as-<role>` session(s) of the scenario · `@sign-ins-<n>` own sign-ins (paced) · `@empty-cart`,
`@restore-stock`, `@unlock-lockable`, `@restore-role`, `@archive-invited`, `@archived-admin` data hooks (`src/support/fixtures.ts`) · `@known-bug` open bug red.
Failed scenarios keep a Playwright trace in `reports/traces/` (steps, DOM, network; mode 600 — it holds session
tokens, never share it): `npm run bdd:trace -- <file.zip>` or VS Code task «BDD: open a failure trace». `BDD_TRACE=0`
turns tracing off; scenarios that type a password (`@sign-ins-<n>`) are never traced.
`HEADED=1 npm run bdd:p1` shows the browser; `BDD_WORKERS=1 npm run bdd` runs one at a time.

## Structure

```text
src/
  features/   Gherkin scenarios: admin-portal/, vendor-portal/, member-portal/
  steps/      Cucumber step definitions: admin-portal/, vendor-portal/, member-portal/, common.steps.ts
  pages/      Page Object Model classes
  support/    World (typed stash keys), hooks (lifecycle, sessions, evidence), fixtures (data hooks), auth state, adapter
  utils/      API (base URL from `API_URL`, default in src/testdata/index.ts), environment, e-mail, PDF, file helpers
  testdata/   JSON data and test files
```
