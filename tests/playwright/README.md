# Playwright frontend tests

Automated browser tests for the `au.com.agileware.eventmanagelocations` CiviCRM extension,
covering the behaviour documented in the extension's test plan: permission-gated visibility,
"use existing" vs "create new" location, switching between options/locations, data-integrity
regressions, the public Event Info page, the Manage Event Locations screen, and the standalone
Edit Location form.

## How this fits together

- **CI**: `.github/workflows/frontend-tests.yml` at the repo root calls a centrally-managed
  reusable workflow (`agileware/ci-workflows` → `.github/workflows/playwright-tests.yml`) that
  spins up a throwaway WordPress + CiviCRM site in Docker, enables this extension, runs
  [`fixtures/setup-environment.sh`](fixtures/setup-environment.sh) to create test users/roles and
  seed data, then runs this Playwright suite against it. The environment/orchestration is
  centrally managed; the tests themselves live here, in this repo.
- **Local development**: point a running CiviCRM site (e.g. a ddev site) at these tests - see
  below.

## Running locally

1. Have a WordPress + CiviCRM site with this extension enabled (a ddev site is the usual local
   setup - see the main [README](../../README.md)).
2. Install dependencies:
   ```bash
   cd tests/playwright
   npm install
   npx playwright install
   ```
3. Seed test users/roles and test data. `wp`/`cv` need to run inside the site's environment, so
   wrap the call for however you're running the site, e.g. under ddev:
   ```bash
   CIVI_EXEC_PREFIX="ddev exec -s web" npm run seed
   ```
   (Omit `CIVI_EXEC_PREFIX` entirely if `wp`/`cv`/`php` are already directly on your `PATH` against
   the target site.)
4. Run the tests, pointing `BASE_URL` at your site and `CIVI_EXEC_PREFIX` the same way (tests shell
   out to `cv api4` to assert on real database state, not just what's rendered):
   ```bash
   BASE_URL=https://your-site.ddev.site CIVI_EXEC_PREFIX="ddev exec -s web" npm test
   ```
5. View the HTML report after a run: `npm run report`.

## Test data

[`fixtures/setup-environment.sh`](fixtures/setup-environment.sh) creates two WordPress
users/roles (see [`fixtures/test-users.json`](fixtures/test-users.json)):

- **Privileged** - `access CiviCRM`, `access CiviEvent`, and this extension's `edit locations`
  permission.
- **Non-privileged** - `access CiviCRM`, `access CiviEvent`, but explicitly *not* `edit locations`.

and seeds three shared Locations and three Events (see
[`fixtures/test-data.json`](fixtures/test-data.json)) via
[`fixtures/seed-data.php`](fixtures/seed-data.php) (run with `cv scr`). Seeding is idempotent -
safe to re-run.

Specs look these up by name/title at runtime (`getLocBlockIdByLocationName` /
`getEventIdByTitle` in [`fixtures/civi.ts`](fixtures/civi.ts)) rather than assuming fixed IDs.
Treat the seeded locations/events as **shared, read-mostly fixtures** across spec files - tests
that need to freely create/modify/delete data create their own throwaway records instead.

## Layout

- `fixtures/base.ts` - Playwright `test`/`expect` extended with `privilegedPage`,
  `nonPrivilegedPage`, and `adminPage` fixtures (each a pre-authenticated browser context), plus
  small URL helpers.
- `fixtures/civi.ts` - shells out to `cv api4` (via `CIVI_EXEC_PREFIX`) so specs can assert on
  actual database state, not just the DOM.
- `fixtures/test-users.json` / `fixtures/test-data.json` - single source of truth for seeded
  usernames/passwords and location/event names, shared between the seed script and the specs.
- `fixtures/setup-environment.sh` / `fixtures/seed-data.php` - environment setup, run once before
  the suite.
- `specs/*.spec.ts` - one file per test-plan suite (permissions, use-existing-location,
  create-new-location, switching-locations, data-integrity, public-event-info,
  manage-event-locations, edit-location-form).
