import { test, expect, MANAGE_EVENT_LOCATIONS_URL, eventsUsingLocationUrl } from '../fixtures/base';
import { civiApi4, civiApi4Single } from '../fixtures/civi';
import testData from '../fixtures/test-data.json';
import type { Locator, Page } from '@playwright/test';

/**
 * Test plan: "Events Using This Location" (grounded against the added
 * button column in managed/SavedSearch_ManageEventLocations.mgd.php, the new
 * managed/SavedSearch_EventsUsingLocation.mgd.php, and
 * ang/afsearchEventsUsingLocation.aff.html) plus the generic SearchKit
 * "Update Events" bulk task it enables for re-assigning a Location.
 *
 * The row action's button is only rendered for locations with at least one
 * Event attached (a `COUNT(...) > 0` link condition) - Location A / its
 * seeded "withLocationA" event cover that read-only case safely, since
 * they're shared, read-mostly fixtures (see tests/playwright/README.md).
 * Every other scenario here needs an exact, known Event count (zero, or a
 * specific set to check sort order/columns/bulk-reassignment against), so
 * each uses its own dedicated throwaway Location(s)/Event(s) created and
 * torn down in beforeAll/afterAll, per this repo's established convention
 * (see switching-locations.spec.ts, create-new-location.spec.ts) - never the
 * shared seed data, which other spec files may concurrently rely on.
 */

test.describe('Manage Event Locations listing - "Events using this location" row action', () => {
  test('shows the button for a location that has at least one Event attached', async ({ privilegedPage }) => {
    await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
    await privilegedPage.waitForLoadState('networkidle');

    const row = privilegedPage.locator('tr', { hasText: testData.locations.a.name });
    await expect(row.getByRole('link', { name: 'Events using this location' })).toBeVisible();
  });

  test.describe('a location with no Events attached', () => {
    test.describe.configure({ mode: 'serial' });

    const name = `EML Throwaway Zero Events ${Date.now()}`;
    let addressId: number;
    let locBlockId: number;

    test.beforeAll(async () => {
      const address = await civiApi4Single<{ id: number }>('Address.create', {
        values: { name, street_address: '0 Empty Street', city: 'Darwin' },
      });
      addressId = address.id;
      const locBlock = await civiApi4Single<{ id: number }>('LocBlock.create', {
        values: { address_id: addressId },
      });
      locBlockId = locBlock.id;
    });

    test.afterAll(async () => {
      await civiApi4('LocBlock.delete', { where: [['id', '=', locBlockId]] });
      await civiApi4('Address.delete', { where: [['id', '=', addressId]] });
    });

    test('shows no "Events using this location" button', async ({ privilegedPage }) => {
      await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
      await privilegedPage.waitForLoadState('networkidle');

      const row = privilegedPage.locator('tr', { hasText: name });
      await expect(row).toBeVisible();
      await expect(row.getByRole('link', { name: 'Events using this location' })).toHaveCount(0);
    });
  });
});

test.describe('Events Using This Location screen', () => {
  test.describe.configure({ mode: 'serial' });

  const locationName = `EML Throwaway Events Screen ${Date.now()}`;
  let addressId: number;
  let locBlockId: number;
  let laterEventId: number;
  let earlierEventId: number;

  test.beforeAll(async () => {
    const address = await civiApi4Single<{ id: number }>('Address.create', {
      values: { name: locationName, street_address: '1 Screen Test Street', city: 'Canberra' },
    });
    addressId = address.id;
    const locBlock = await civiApi4Single<{ id: number }>('LocBlock.create', {
      values: { address_id: addressId },
    });
    locBlockId = locBlock.id;

    // Deliberately out of both creation order and alphabetical order, so a
    // sort-order assertion can't pass by accident.
    const earlier = await civiApi4Single<{ id: number }>('Event.create', {
      values: {
        title: 'EML Throwaway Events Screen - Earlier Inactive Event',
        'event_type_id:name': 'Meeting',
        start_date: '2030-01-01',
        is_active: false,
        loc_block_id: locBlockId,
      },
    });
    earlierEventId = earlier.id;

    const later = await civiApi4Single<{ id: number }>('Event.create', {
      values: {
        title: 'EML Throwaway Events Screen - Later Active Event',
        'event_type_id:name': 'Meeting',
        start_date: '2035-06-15',
        is_active: true,
        loc_block_id: locBlockId,
      },
    });
    laterEventId = later.id;
  });

  test.afterAll(async () => {
    await civiApi4('Event.delete', { where: [['id', 'IN', [earlierEventId, laterEventId]]] });
    await civiApi4('LocBlock.delete', { where: [['id', '=', locBlockId]] });
    await civiApi4('Address.delete', { where: [['id', '=', addressId]] });
  });

  test('the row action link filters to only this Location\'s Events, not the whole Event table', async ({ privilegedPage }) => {
    await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
    await privilegedPage.waitForLoadState('networkidle');

    const row = privilegedPage.locator('tr', { hasText: locationName });
    await row.getByRole('link', { name: 'Events using this location' }).click();
    await privilegedPage.waitForLoadState('networkidle');

    // The link's target uses a `#/?loc_block_id=ID` hash fragment, not a
    // plain query string - Afform's routeParams reads Angular's own
    // $location.search(), which only sees the hash portion (see
    // eventsUsingLocationUrl() in fixtures/base.ts).
    expect(privilegedPage.url()).toContain(`loc_block_id=${locBlockId}`);

    await expect(privilegedPage.getByText('EML Throwaway Events Screen - Later Active Event')).toBeVisible();
    await expect(privilegedPage.getByText('EML Throwaway Events Screen - Earlier Inactive Event')).toBeVisible();
    // Some other, unrelated Event must not leak into this filtered list.
    await expect(privilegedPage.getByText(testData.events.withLocationA.title)).toHaveCount(0);
  });

  test('lists Event Title, Event Start Date, and Is Active, with the most recently-starting Event on top', async ({ privilegedPage }) => {
    await privilegedPage.goto(eventsUsingLocationUrl(locBlockId));
    await privilegedPage.waitForLoadState('networkidle');

    const rows = privilegedPage.locator('tbody tr');
    await expect(rows).toHaveCount(2);

    // Reverse start-date order: 2035 (later) above 2030 (earlier).
    await expect(rows.nth(0)).toContainText('EML Throwaway Events Screen - Later Active Event');
    await expect(rows.nth(0)).toContainText('2035');
    await expect(rows.nth(0)).toContainText('Yes');

    await expect(rows.nth(1)).toContainText('EML Throwaway Events Screen - Earlier Inactive Event');
    await expect(rows.nth(1)).toContainText('2030');
    await expect(rows.nth(1)).toContainText('No');

    // The Event Title is a link straight to that Event's settings page.
    const titleLink = rows.nth(0).getByRole('link', { name: 'EML Throwaway Events Screen - Later Active Event' });
    await expect(titleLink).toHaveAttribute('href', new RegExp(`id=${laterEventId}\\b`));
  });

  test('Back to Manage Event Locations button returns to the listing', async ({ privilegedPage }) => {
    await privilegedPage.goto(eventsUsingLocationUrl(locBlockId));
    await privilegedPage.waitForLoadState('networkidle');

    await privilegedPage.getByRole('link', { name: 'Back to Manage Event Locations' }).click();
    await privilegedPage.waitForLoadState('networkidle');

    expect(privilegedPage.url()).toContain('q=civicrm%2Fmanage-event-locations');
    await expect(privilegedPage.getByText(locationName)).toBeVisible();
  });
});

/**
 * Drives the generic SearchKit "Update Events" bulk task's crm-select2
 * (Select2.js v3) "Add Value" field/value pickers.
 *
 * Clicking the container alone is unreliable immediately after the dialog's
 * own open animation - `force: true` plus a settle wait (below, before this
 * is ever called) avoids racing that, matching the equally fiddly
 * crm-select2 pattern this repo already worked out for the (since-removed)
 * "Update Address" row action - see git history on manage-event-locations.spec.ts
 * around #64/#65. Typing into the search box that appears, then pressing
 * Enter on the highlighted match, is more robust than clicking a specific
 * result li directly, which can race the results list repositioning.
 */
async function pickSelect2Value(page: Page, container: Locator, text: string) {
  await container.click({ force: true });
  await expect(page.locator('.select2-drop-active .select2-results li').first()).toBeVisible();
  await page.keyboard.type(text);
  await expect(page.locator('.select2-drop-active .select2-results .select2-highlighted').first()).toBeVisible();
  await page.keyboard.press('Enter');
}

test.describe('Bulk "Update Events" action re-assigns selected Events to a different Location', () => {
  test.describe.configure({ mode: 'serial' });

  let originAddressId: number;
  let originLocBlockId: number;
  let targetAddressId: number;
  let targetLocBlockId: number;
  let eventOneId: number;
  let eventTwoId: number;
  const targetStreetAddress = `${Date.now()} Reassign Target Street`;

  test.beforeAll(async () => {
    const originAddress = await civiApi4Single<{ id: number }>('Address.create', {
      values: { name: `EML Reassign Origin ${Date.now()}`, street_address: '1 Reassign Origin Street', city: 'Adelaide' },
    });
    originAddressId = originAddress.id;
    const originLocBlock = await civiApi4Single<{ id: number }>('LocBlock.create', {
      values: { address_id: originAddressId },
    });
    originLocBlockId = originLocBlock.id;

    const targetAddress = await civiApi4Single<{ id: number }>('Address.create', {
      values: { name: `EML Reassign Target ${Date.now()}`, street_address: targetStreetAddress, city: 'Adelaide' },
    });
    targetAddressId = targetAddress.id;
    const targetLocBlock = await civiApi4Single<{ id: number }>('LocBlock.create', {
      values: { address_id: targetAddressId },
    });
    targetLocBlockId = targetLocBlock.id;

    const eventOne = await civiApi4Single<{ id: number }>('Event.create', {
      values: {
        title: 'EML Reassign Test Event One',
        'event_type_id:name': 'Meeting',
        start_date: '2030-01-01',
        loc_block_id: originLocBlockId,
      },
    });
    eventOneId = eventOne.id;

    const eventTwo = await civiApi4Single<{ id: number }>('Event.create', {
      values: {
        title: 'EML Reassign Test Event Two',
        'event_type_id:name': 'Meeting',
        start_date: '2030-02-01',
        loc_block_id: originLocBlockId,
      },
    });
    eventTwoId = eventTwo.id;
  });

  test.afterAll(async () => {
    await civiApi4('Event.delete', { where: [['id', 'IN', [eventOneId, eventTwoId]]] });
    await civiApi4('LocBlock.delete', { where: [['id', 'IN', [originLocBlockId, targetLocBlockId]]] });
    await civiApi4('Address.delete', { where: [['id', 'IN', [originAddressId, targetAddressId]]] });
  });

  test('selecting both Events, then Update Events > Location Block > the target Location, re-assigns both', async ({ privilegedPage }) => {
    await privilegedPage.goto(eventsUsingLocationUrl(originLocBlockId));
    await privilegedPage.waitForLoadState('networkidle');

    await privilegedPage.locator('tbody input[type="checkbox"]').nth(0).check();
    await privilegedPage.locator('tbody input[type="checkbox"]').nth(1).check();
    await privilegedPage.getByRole('button', { name: 'Action' }).click();
    await privilegedPage.getByRole('link', { name: 'Update Events' }).click();

    const dialog = privilegedPage.getByRole('dialog');
    await expect(dialog).toBeVisible();
    // Let the dialog's own open animation fully settle before driving the
    // select2 widgets inside it - interacting mid-animation is what makes
    // this flaky (see pickSelect2Value's own comment).
    await privilegedPage.waitForTimeout(1000);

    await pickSelect2Value(privilegedPage, dialog.locator('.select2-container').first(), 'Location Block');
    // The value picker (an entity-reference autocomplete) only appears once
    // the field above it has been chosen.
    await pickSelect2Value(privilegedPage, dialog.locator('.select2-container', { hasText: 'Select' }).first(), targetStreetAddress);

    await dialog.getByRole('button', { name: /Update Events?/ }).click();

    await expect(privilegedPage.getByText('Successfully updated 2 Events.')).toBeVisible();

    const events = await civiApi4<Array<{ id: number; loc_block_id: number }>>('Event.get', {
      where: [['id', 'IN', [eventOneId, eventTwoId]]],
      select: ['id', 'loc_block_id'],
    });
    expect(events).toHaveLength(2);
    for (const event of events) {
      expect(event.loc_block_id).toBe(targetLocBlockId);
    }

    // The listing is filtered to the origin Location and re-queries live -
    // both Events just moved away from it, so it's now empty.
    await expect(privilegedPage.getByText('None found.')).toBeVisible();
  });
});
