import { test as base, expect, type Page } from '@playwright/test';
import users from './test-users.json';

type Fixtures = {
  privilegedPage: Page;
  nonPrivilegedPage: Page;
  adminPage: Page;
};

async function login(page: Page, username: string, password: string) {
  await page.goto('/wp-login.php');
  await page.locator('#user_login').fill(username);
  await page.locator('#user_pass').fill(password);
  await page.locator('#wp-submit').click();
  await page.waitForURL(/wp-admin/);
}

export const test = base.extend<Fixtures>({
  // A page logged in as a user with the extension's "edit locations"
  // permission - sees both "Use existing location" and "Create new
  // location", plus the Edit Location link/form.
  privilegedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, users.privileged.username, users.privileged.password);
    await use(page);
    await context.close();
  },

  // A page logged in as a user with access to Manage Events but WITHOUT
  // "edit locations" - only "Use existing location" is available, and the
  // Edit Location form must render frozen.
  nonPrivilegedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(page, users.nonPrivileged.username, users.nonPrivileged.password);
    await use(page);
    await context.close();
  },

  // The WordPress admin account (full CiviCRM admin access) - only needed for
  // checks against admin-only screens such as Access Control.
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await login(
      page,
      process.env.WP_ADMIN_USER || 'admin',
      process.env.WP_ADMIN_PASS || 'admin'
    );
    await use(page);
    await context.close();
  },
});

export { expect };

/**
 * Builds an admin-side CiviCRM URL: `/wp-admin/admin.php?page=CiviCRM&q=<path>&...`.
 *
 * This WordPress integration serves back-office CiviCRM pages (Manage
 * Events, Manage Event Locations, Access Control, EditLocation, etc.)
 * through the WP admin dispatcher rather than the clean `/civicrm/...`
 * frontend path - that clean path is reserved for genuinely public pages
 * routed through the CiviCRM base page (e.g. civicrm/event/info), which
 * anonymous visitors need to reach without ever hitting wp-admin.
 */
export function civiAdminUrl(path: string, params: Record<string, string | number> = {}): string {
  const query = new URLSearchParams({ page: 'CiviCRM', q: path });
  for (const [key, value] of Object.entries(params)) {
    query.set(key, String(value));
  }
  return `/wp-admin/admin.php?${query.toString()}`;
}

/**
 * Navigate straight to an Event's Location tab.
 *
 * `civicrm/event/manage/location` is this tab's own registered menu path
 * (CRM_Event_Form_ManageEvent_Location), not a subpage of the generic
 * `civicrm/event/manage` wizard URL. The tab also does an initial render
 * plus a separate AJAX re-fetch, so this waits for network idle before
 * returning - callers can rely on the DOM already reflecting the
 * server-resolved option/location, not an interim state.
 */
export async function gotoEventLocationTab(page: Page, eventId: number) {
  await page.goto(civiAdminUrl('civicrm/event/manage/location', { reset: 1, id: eventId, action: 'update' }));
  await page.waitForLoadState('networkidle');
}

export function editLocationUrl(bid?: number) {
  return bid
    ? civiAdminUrl('civicrm/EditLocation', { bid, reset: 1 })
    : civiAdminUrl('civicrm/EditLocation', { reset: 1 });
}

export const MANAGE_EVENT_LOCATIONS_URL = civiAdminUrl('civicrm/manage-event-locations', { reset: 1 });
