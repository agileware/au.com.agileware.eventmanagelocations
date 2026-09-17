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
 * Navigate straight to an Event's Location tab.
 */
export async function gotoEventLocationTab(page: Page, eventId: number) {
  await page.goto(
    `/civicrm/event/manage?action=update&id=${eventId}&reset=1&selectedChild=location`
  );
}

export function editLocationUrl(bid?: number) {
  return bid ? `/civicrm/EditLocation?bid=${bid}&reset=1` : '/civicrm/EditLocation?reset=1';
}

export const MANAGE_EVENT_LOCATIONS_URL = '/civicrm/manage-event-locations?reset=1';
