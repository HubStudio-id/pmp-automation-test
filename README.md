# PMP Automation Test

![Node.js](https://img.shields.io/badge/Node.js-26.12%2B-green)
![Cucumber](https://img.shields.io/badge/Cucumber-BDD-brightgreen)
![Playwright](https://img.shields.io/badge/Playwright-Chromium-blue)
![Allure](https://img.shields.io/badge/Allure-Report-red)

PMP Automation Test is a pre-release regression suite for the PMP Admin, Vendor, and Member portals. It is built with
Cucumber BDD, Playwright, TypeScript, and Allure reporting, with GitHub Actions used for CI execution.

---

## Project Architecture

- Uses the Page Object Model (POM) to separate UI actions from test scenarios.
- Uses Gherkin feature files so regression cases remain readable and traceable.
- Groups features, steps, and page objects by portal: Admin, Vendor, and Member.
- Reuses authenticated sessions to reduce sign-in rate-limit failures.
- Keeps test data in `src/testdata/` and credentials in environment variables only.
- Generates Cucumber and Allure reports for local and CI runs.

---

## Regression Coverage

| Portal | Coverage |
|:--|:--|
| **Admin** | Login, roles and access, dashboard, products, vendor registration, contracts, negotiations, templates, tasks, logs, and filters |
| **Vendor** | Login, vendor registration, activation, products, negotiations, contracts, and invitations |
| **Member** | Login, account, catalog, cart, notifications, registration, Help Desk, and activation |
| **Cross-portal** | Vendor-to-Admin negotiation, registration, invitation, and shared business data |

Test cases are organized in `src/features/<portal>/<area>/` and tagged with priority, regression ID, severity, and
the account session they use.

---

## Setup

Requirements:

- Node.js 26.12.1 or newer
- npm
- Chromium dependencies supported by Playwright
- QA credentials for the staging portals

Install the project:

```bash
git clone https://github.com/HubStudio-id/pmp-automation-test.git
cd pmp-automation-test
npm install
npx playwright install chromium
```

Create a local `.env` file with the staging URLs, QA account credentials, API URL, and Gmail API values needed by
invitation scenarios. Keep the file private with mode `600`; it is ignored by Git and must never be committed.

Prepare or refresh reusable authenticated sessions:

```bash
npm run bdd:accounts
npm run bdd:auth
```

---

## How to Run Tests

Run the smoke suite:

```bash
npm run bdd:p1
```

Run the full regression cycle:

```bash
npm run bdd:all
```

Run one portal:

```bash
npm run bdd:admin-portal
npm run bdd:vendor-portal
npm run bdd:member-portal
```

Run one specific scenario by its name:

```bash
NODE_OPTIONS='--import tsx' npx cucumber-js --profile p1 \
  --name 'The role page answers «Akses Ditolak»'
```

Run the validation gate without opening a browser:

```bash
npm run bdd:check
```

Run a clean cycle and open the Allure report:

```bash
npm run bdd:fresh
```

Or build and open the current report separately:

```bash
npm run bdd:report
```

---

## Reports

The test runner writes reports under `reports/`:

```text
reports/
├── pmp-smoke/          Smoke Allure, Cucumber, and trace outputs
└── pmp-regression/     Full regression Allure, Cucumber, and trace outputs
```

The Allure report title follows the run type: **PMP - Smoke Test Report** for `bdd:p1`, and
**PMP - Regression Test Report** for `bdd:all` and `bdd:fresh`.
The top-level Allure group is always `pmp`; only the report title and storage folder vary by run type.

➡️ [Open the latest live Allure Report](https://hubstudio-id.github.io/pmp-automation-test/)

Playwright traces can contain session tokens. Do not commit or share them outside the QA team.

---

## CI/CD

The workflow is defined in `.github/workflows/pmp-automation-test.yml`.

| Trigger | Suite |
|:--|:--|
| Pull request | Smoke |
| Push to `main` | Smoke |
| Manual trigger | Smoke or Regression |
| Every Monday at 02:00 WIB | Full Regression |

The pipeline flow is:

```text
Checkout Repository
   |
Setup Node.js
   |
Install Dependencies and Chromium
   |
Load PMP_ENV_FILE Secret
   |
Validate TypeScript and Cucumber Steps
   |
Run Smoke or Full Regression
   |
Generate Allure and Cucumber Reports
   |
Check Generated Allure Report
   |
Upload Test Reports as Artifact
   |
Upload Report for GitHub Pages
   |
Deploy Allure Report to GitHub Pages
```

Before running CI, create a repository secret named `PMP_ENV_FILE`. Its value must be the complete local `.env` file.
The workflow creates a temporary `.env` inside the runner; the local `.env` is never used by GitHub Actions.

Do not print, commit, or attach credentials, tokens, invitation links, or Playwright traces.

### Latest workflow status

[![PMP Automation Test](https://github.com/HubStudio-id/pmp-automation-test/actions/workflows/pmp-automation-test.yml/badge.svg)](https://github.com/HubStudio-id/pmp-automation-test/actions/workflows/pmp-automation-test.yml)

---

## Project Structure

```text
src/
├── features/      Gherkin scenarios grouped by portal and area
├── steps/         Cucumber step definitions grouped by portal
├── pages/         Playwright Page Object Model classes
├── support/       World, hooks, sessions, fixtures, and adapter
├── utils/         API, environment, e-mail, PDF, and file helpers
└── testdata/      QA test data and test files

tools/             Session, account, data-check, and phase-runner utilities
reports/           Cucumber, Allure, and failure outputs
.github/workflows/ GitHub Actions CI workflow
```

## Useful Commands

| Command | Purpose |
|:--|:--|
| `npm run bdd:auth` | Prepare and reuse saved sessions |
| `npm run bdd:data-check` | Validate reusable staging fixtures |
| `npm run bdd:check` | Typecheck and verify Cucumber steps |
| `npm run bdd:p1` | Run the smoke suite |
| `npm run bdd:all` | Run the full regression cycle |
| `npm run bdd:report` | Generate and open Allure |
| `npm run bdd:trace -- <file.zip>` | Open a failed Playwright trace |
