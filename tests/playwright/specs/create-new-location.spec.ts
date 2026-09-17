import { test, expect, gotoEventLocationTab } from '../fixtures/base';
import { civiApi4, civiApi4Single, getEventIdByTitle, getLocBlockIdByLocationName } from '../fixtures/civi';
import testData from '../fixtures/test-data.json';

/**
 * Test plan Suite C: Create new location (privileged users only).
 */

test.describe('Create new location', () => {
  test('selecting Create new location on a blank event shows blank, editable fields', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);
    await gotoEventLocationTab(privilegedPage, eventId);

    await privilegedPage.locator('input[type="radio"][name="location_option"][value="1"]').check();
    await privilegedPage.waitForLoadState('networkidle');

    const streetInput = privilegedPage.locator('input[name="address[1][street_address]"]');
    const cityInput = privilegedPage.locator('input[name="address[1][city]"]');

    await expect(streetInput).toBeVisible();
    await expect(cityInput).toBeVisible();
    await expect(streetInput).toBeEnabled();
    await expect(cityInput).toBeEnabled();
    await expect(streetInput).toHaveValue('');
    await expect(cityInput).toHaveValue('');

    // Not testing a specific country/state value - only that the fields are
    // present and usable, not frozen like the "use existing" case.
    await expect(privilegedPage.locator('select[name="address[1][country_id]"]')).toBeEnabled();
  });

  test('filling in and saving a new location creates an independent LocBlock attached only to this event', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.blankTwo.title);
    await gotoEventLocationTab(privilegedPage, eventId);

    await privilegedPage.locator('input[type="radio"][name="location_option"][value="1"]').check();
    await privilegedPage.waitForLoadState('networkidle');

    await privilegedPage.locator('input[name="address[1][street_address]"]').fill('99 New Street');
    await privilegedPage.locator('input[name="address[1][city]"]').fill('Perth');
    await privilegedPage.getByRole('button', { name: 'Save' }).click();
    await privilegedPage.waitForLoadState('networkidle');

    const event = await civiApi4Single<{ loc_block_id: number }>('Event.get', {
      where: [['id', '=', eventId]],
      select: ['loc_block_id'],
    });
    expect(event.loc_block_id).toBeTruthy();

    const newAddress = await civiApi4Single<{ street_address: string; city: string }>('Address.get', {
      join: [['LocBlock AS locblock', 'INNER']],
      where: [['locblock.id', '=', event.loc_block_id]],
      select: ['street_address', 'city'],
    });
    expect(newAddress.street_address).toBe('99 New Street');
    expect(newAddress.city).toBe('Perth');

    // None of the seeded locations were touched by this save.
    for (const location of Object.values(testData.locations)) {
      const locBlockId = await getLocBlockIdByLocationName(location.name);
      const address = await civiApi4Single<{ street_address: string; city: string }>('Address.get', {
        join: [['LocBlock AS locblock', 'INNER']],
        where: [['locblock.id', '=', locBlockId]],
        select: ['street_address', 'city'],
      });
      expect(address.street_address).toBe(location.street_address);
      expect(address.city).toBe(location.city);
    }
  });
});

test.describe('Create new location - regression: switching away from an existing location does not corrupt it', () => {
  test.describe.configure({ mode: 'serial' });

  let eventId: number;
  let locBlockAId: number;

  test.beforeAll(async () => {
    eventId = await getEventIdByTitle(testData.events.withLocationA.title);
    locBlockAId = await getLocBlockIdByLocationName(testData.locations.a.name);
  });

  test.afterAll(async () => {
    // This spec mutates the shared withLocationA event's location - restore
    // it so other spec files that also reference withLocationA are unaffected.
    await civiApi4('Event.update', {
      where: [['id', '=', eventId]],
      values: { loc_block_id: locBlockAId },
    });
  });

  test('switching to Create new location blanks the fields, and saving a new location leaves Location A untouched', async ({ privilegedPage }) => {
    await gotoEventLocationTab(privilegedPage, eventId);

    // Starts on "Use existing location" with Location A selected/frozen.
    await expect(privilegedPage.locator('input[type="radio"][name="location_option"][value="2"]')).toBeChecked();
    await expect(privilegedPage.getByText(testData.locations.a.street_address)).toBeVisible();

    await privilegedPage.locator('input[type="radio"][name="location_option"][value="1"]').check();
    await privilegedPage.waitForLoadState('networkidle');

    const streetInput = privilegedPage.locator('input[name="address[1][street_address]"]');
    const cityInput = privilegedPage.locator('input[name="address[1][city]"]');

    // Blank, not just re-showing Location A's data.
    await expect(streetInput).toHaveValue('');
    await expect(cityInput).toHaveValue('');
    await expect(streetInput).not.toHaveValue(testData.locations.a.street_address);
    await expect(cityInput).not.toHaveValue(testData.locations.a.city);

    await streetInput.fill('50 Regression Street');
    await cityInput.fill('Adelaide');
    const emailInput = privilegedPage.locator('input[name="email[1][email]"]');
    if (await emailInput.count()) {
      await emailInput.fill('regression-d3@example.com');
    }
    const phoneInput = privilegedPage.locator('input[name="phone[1][phone]"]');
    if (await phoneInput.count()) {
      await phoneInput.fill('0399999999');
    }

    await privilegedPage.getByRole('button', { name: 'Save' }).click();
    await privilegedPage.waitForLoadState('networkidle');

    // Location A must still exist, completely unchanged - this is the
    // historical bug: saving used to silently overwrite/delete Location A
    // instead of creating an independent new location.
    const locationAStillExists = await civiApi4<Array<{ id: number }>>('LocBlock.get', {
      where: [['id', '=', locBlockAId]],
      select: ['id'],
    });
    expect(locationAStillExists).toHaveLength(1);

    const addressA = await civiApi4Single<{ street_address: string; city: string }>('Address.get', {
      join: [['LocBlock AS locblock', 'INNER']],
      where: [['locblock.id', '=', locBlockAId]],
      select: ['street_address', 'city'],
    });
    expect(addressA.street_address).toBe(testData.locations.a.street_address);
    expect(addressA.city).toBe(testData.locations.a.city);

    // The event now points at a brand-new, independent LocBlock with the
    // freshly entered details.
    const event = await civiApi4Single<{ loc_block_id: number }>('Event.get', {
      where: [['id', '=', eventId]],
      select: ['loc_block_id'],
    });
    expect(event.loc_block_id).not.toBe(locBlockAId);

    const newAddress = await civiApi4Single<{ street_address: string; city: string }>('Address.get', {
      join: [['LocBlock AS locblock', 'INNER']],
      where: [['locblock.id', '=', event.loc_block_id]],
      select: ['street_address', 'city'],
    });
    expect(newAddress.street_address).toBe('50 Regression Street');
    expect(newAddress.city).toBe('Adelaide');
  });
});
