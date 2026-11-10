# PMP Automation Test

![Node.js](https://img.shields.io/badge/Node.js-26.12%2B-orange)
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

## Project Structure

```text
pmp/
├── .github/                          GitHub Actions workflow
├── src/                              Source code automation
│   ├── features/                     Gherkin scenarios
│   ├── steps/                        Cucumber step definitions
│   ├── pages/                        Playwright Page Object Models
│   ├── support/                      World, hooks, fixtures, and runtime adapter
│   ├── utils/                        API and general-purpose helpers
│   ├── testdata/                     Test data and supporting files
│   └── types/                        TypeScript declarations
├── tools/                            Runner, account, auth, and report utilities
└── reports/                          Generated test reports
    ├── pmp-regression/               Full regression report output
    └── pmp-smoke/                    Smoke test report output
```

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

Add a repository secret named `PMP_ENV_FILE` containing the full `.env` content. GitHub Actions creates a temporary
`.env` on the runner. Keep credentials, tokens, invitation links, and Playwright traces private.

### Latest Execution Status

[![PMP Automation Test](https://github.com/HubStudio-id/pmp-automation-test/actions/workflows/pmp-automation-test.yml/badge.svg)](https://github.com/HubStudio-id/pmp-automation-test/actions/workflows/pmp-automation-test.yml)

---

## How to Setup

Requirements:

- Node.js 26.12.1 or newer
- npm
- Chromium dependencies supported by Playwright

Install the project:

```bash
git clone https://github.com/HubStudio-id/pmp-automation-test.git
cd pmp-automation-test
npm install
npx playwright install chromium
```

Create a local `.env` file from the committed template, then fill in the approved QA credentials and Gmail API values
needed by invitation scenarios. Keep the file private with mode `600`; it is ignored by Git and must never be committed.

```bash
cp .env.example .env
chmod 600 .env
```

Prepare or refresh reusable authenticated sessions:

```bash
npm run bdd:accounts
npm run bdd:auth
```

---

## How to Run Tests

Run the smoke test:

```bash
npm run bdd:p1
```

Run the regression test:

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

## Test Reports

➡️ [Click here to see the latest live Allure Report](https://hubstudio-id.github.io/pmp-automation-test/)