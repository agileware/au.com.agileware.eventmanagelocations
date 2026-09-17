import { test, expect, gotoEventLocationTab, editLocationUrl, MANAGE_EVENT_LOCATIONS_URL } from '../fixtures/base';
import { civiApi4, civiApi4Single, getEventIdByTitle, getLocBlockIdByLocationName } from '../fixtures/civi';
import testData from '../fixtures/test-data.json';

/**
 * Test plan Suite H: the standalone Edit Location form
 * (civicrm/EditLocation).
 */

test.describe('Opening an already-attached location', () => {
  // Playwright's test runner resolves fixtures by statically parsing the
  // destructured parameter names, so each fixture needs its own literal
  // `async ({ privilegedPage }) => {...}` - a loop over a dynamic fixture
  // name can't be destructured as `{ [pageFixture]: page }` (see
  // use-existing-location.spec.ts for the same constraint).
  async function assertsOpensWithoutError(page: import('@playwright/test').Page) {
    const locBlockId = getLocBlockIdByLocationName(testData.locations.a.name);
    const response = await page.goto(editLocationUrl(locBlockId));

    expect(response?.status() ?? 200).toBeLessThan(500);
    await expect(page.getByText(/expected one locblock but found 0/i)).toHaveCount(0);
    await expect(page.locator('input[name="address[1][street_address]"]')).toHaveValue(
      testData.locations.a.street_address
    );
  }

  test("privileged user can open Location A's Edit Location form without error", async ({ privilegedPage }) => {
    await assertsOpensWithoutError(privilegedPage);
  });

  test("non-privileged user can open Location A's Edit Location form without error", async ({ nonPrivilegedPage }) => {
    await assertsOpensWithoutError(nonPrivilegedPage);
  });
});

test.describe('Saving updates the shared LocBlock in place', () => {
  // Location A is a shared fixture other spec files rely on - always restore
  // its original street_address/city, whether or not the test itself passed.
  test.afterEach(async () => {
    const locBlockId = getLocBlockIdByLocationName(testData.locations.a.name);
    const address = civiApi4Single<{ id: number }>('Address.get', {
      join: [['LocBlock AS locblock', 'INNER']],
      where: [['locblock.id', '=', locBlockId]],
      select: ['id'],
    });
    civiApi4('Address.update', {
      where: [['id', '=', address.id]],
      values: {
        street_address: testData.locations.a.street_address,
        city: testData.locations.a.city,
      },
    });
  });

  test('saving a change to Location A propagates to every Event sharing it', async ({ privilegedPage }) => {
    const locBlockId = getLocBlockIdByLocationName(testData.locations.a.name);
    const tempStreetAddress = `TEMP ${Date.now()} Test Street`;

    await privilegedPage.goto(editLocationUrl(locBlockId));
    await privilegedPage.locator('input[name="address[1][street_address]"]').fill(tempStreetAddress);
    await privilegedPage.getByRole('button', { name: 'Save' }).click();
    await privilegedPage.waitForLoadState('networkidle');

    const updated = civiApi4Single<{ street_address: string }>('Address.get', {
      join: [['LocBlock AS locblock', 'INNER']],
      where: [['locblock.id', '=', locBlockId]],
      select: ['street_address'],
    });
    expect(updated.street_address).toBe(tempStreetAddress);

    // withLocationA shares this exact LocBlock - re-fetch the Address via
    // the Event's own loc_block_id to demonstrate the propagation, not just
    // that Location A's own record changed.
    const eventId = await getEventIdByTitle(testData.events.withLocationA.title);
    const event = civiApi4Single<{ loc_block_id: number }>('Event.get', {
      where: [['id', '=', eventId]],
      select: ['loc_block_id'],
    });
    expect(event.loc_block_id).toBe(locBlockId);

    const viaEvent = civiApi4Single<{ street_address: string }>('Address.get', {
      join: [['LocBlock AS locblock', 'INNER']],
      where: [['locblock.id', '=', event.loc_block_id]],
      select: ['street_address'],
    });
    expect(viaEvent.street_address).toBe(tempStreetAddress);
  });
});

test.describe('Non-privileged users see a frozen, read-only form', () => {
  test('no Save button, and the street address is not a live, editable input', async ({ nonPrivilegedPage }) => {
    const locBlockId = getLocBlockIdByLocationName(testData.locations.a.name);
    await nonPrivilegedPage.goto(editLocationUrl(locBlockId));

    await expect(nonPrivilegedPage.getByRole('button', { name: 'Save' })).toHaveCount(0);

    const streetInput = nonPrivilegedPage.locator('input[name="address[1][street_address]"]');
    if (await streetInput.count()) {
      await expect(streetInput).toBeDisabled();
    }
  });
});

test.describe('Creating a new location from this form', () => {
  test('a new, unattached LocBlock appears in the pool and in the "Use existing location" picker', async ({ privilegedPage }) => {
    const streetAddress = `${Date.now()} EditLocation New Street`;
    const city = 'Adelaide';
    const email = `emlneweditlocation${Date.now()}@example.test`;
    const phone = '0311199988';

    await privilegedPage.goto(editLocationUrl());
    await privilegedPage.locator('input[name="address[1][street_address]"]').fill(streetAddress);
    await privilegedPage.locator('input[name="address[1][city]"]').fill(city);
    await privilegedPage.locator('input[name="email[1][email]"]').fill(email);
    await privilegedPage.locator('input[name="phone[1][phone]"]').fill(phone);
    await privilegedPage.getByRole('button', { name: 'Save' }).click();
    await privilegedPage.waitForLoadState('networkidle');

    // Appears in the Manage Event Locations pool.
    await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
    await privilegedPage.waitForLoadState('networkidle');
    await expect(privilegedPage.getByText(streetAddress)).toBeVisible();

    // Appears in the "Use existing location" picker on an Event's Location
    // tab. The picker's option text is built from the Address's own `name`
    // field (see use-existing-location.spec.ts), which this form has no
    // input for, so match on the street address instead - guaranteed to be
    // present in the option text either way.
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);
    await gotoEventLocationTab(privilegedPage, eventId);
    const options = await privilegedPage.locator('#loc_event_id option').allTextContents();
    expect(options.some((text) => text.includes(streetAddress))).toBe(true);

    // Clean up the throwaway LocBlock/Address/Email/Phone. Not strictly
    // load-bearing on ephemeral per-run CI databases, but good local-dev
    // hygiene so repeated runs don't accumulate junk locations.
    const locBlock = civiApi4Single<{ id: number; address_id: number; email_id: number; phone_id: number }>(
      'LocBlock.get',
      {
        join: [['Address AS address_id', 'INNER']],
        where: [['address_id.street_address', '=', streetAddress]],
        select: ['id', 'address_id', 'email_id', 'phone_id'],
      }
    );
    civiApi4('LocBlock.delete', { where: [['id', '=', locBlock.id]] });
    civiApi4('Address.delete', { where: [['id', '=', locBlock.address_id]] });
    if (locBlock.email_id) {
      civiApi4('Email.delete', { where: [['id', '=', locBlock.email_id]] });
    }
    if (locBlock.phone_id) {
      civiApi4('Phone.delete', { where: [['id', '=', locBlock.phone_id]] });
    }
  });
});
