import { test, expect, gotoEventLocationTab } from '../fixtures/base';
import { civiApi4, civiApi4Single, getEventIdByTitle, getLocBlockIdByLocationName, getAddressByLocBlockId, getAddressByLocationName } from '../fixtures/civi';
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
    await privilegedPage.getByRole('button', { name: 'Save' }).first().click();
    await privilegedPage.waitForLoadState('networkidle');

    const event = await civiApi4Single<{ loc_block_id: number }>('Event.get', {
      where: [['id', '=', eventId]],
      select: ['loc_block_id'],
    });
    expect(event.loc_block_id).toBeTruthy();

    const newAddress = await getAddressByLocBlockId<{ street_address: string; city: string }>(event.loc_block_id, ['street_address', 'city']);
    expect(newAddress.street_address).toBe('99 New Street');
    expect(newAddress.city).toBe('Perth');

    // None of the seeded locations were touched by this save. Looked up by
    // name in one call rather than id-then-address in two, so this can't
    // race a concurrently-running test that recreates one of them under a
    // new id (see getAddressByLocationName()).
    for (const location of Object.values(testData.locations)) {
      const address = await getAddressByLocationName<{ street_address: string; city: string }>(location.name, ['street_address', 'city']);
      expect(address.street_address).toBe(location.street_address);
      expect(address.city).toBe(location.city);
    }
  });
});

test.describe('Create new location - regression: switching away from an existing location does not corrupt it', () => {
  test.describe.configure({ mode: 'serial' });

  // A dedicated throwaway location/event, so this regression - which
  // deliberately detaches an event from a shared-style location mid-test -
  // can't race or corrupt the real shared seed fixtures (Location A /
  // withLocationA) that other spec files also depend on. Mirrors the same
  // throwaway-event approach switching-locations.spec.ts's own regression
  // block already uses for the same reason.
  const originLocationName = `EML Regression C3 Origin ${Date.now()}`;
  const originStreetAddress = '40 Regression Origin Street';
  const originCity = 'Newcastle';
  let originAddressId: number;
  let originLocBlockId: number;
  let eventId: number;
  // Populated once the test itself has switched the event onto its own new,
  // independent LocBlock - captured here so afterAll can clean that up too.
  let newLocBlockId: number | undefined;

  test.beforeAll(async () => {
    const address = await civiApi4Single<{ id: number }>('Address.create', {
      values: { name: originLocationName, street_address: originStreetAddress, city: originCity },
    });
    originAddressId = address.id;
    const locBlock = await civiApi4Single<{ id: number }>('LocBlock.create', {
      values: { address_id: originAddressId },
    });
    originLocBlockId = locBlock.id;

    const event = await civiApi4Single<{ id: number }>('Event.create', {
      values: {
        title: `EML Regression C3 Event ${Date.now()}`,
        'event_type_id:name': 'Meeting',
        start_date: '2030-01-01',
        loc_block_id: originLocBlockId,
      },
    });
    eventId = event.id;
  });

  test.afterAll(async () => {
    // Deleting the Event only detaches loc_block_id first (this extension's
    // own hook_civicrm_pre('delete', 'Event', ...) guard against CiviCRM
    // core's cascade-delete) rather than deleting whichever LocBlock it
    // currently points at - both the origin and the newly-created "50
    // Regression Street" LocBlock/Address need cleaning up separately.
    await civiApi4('Event.delete', { where: [['id', '=', eventId]] });

    if (newLocBlockId) {
      const newLocBlock = await civiApi4Single<{ address_id: number }>('LocBlock.get', {
        where: [['id', '=', newLocBlockId]],
        select: ['address_id'],
      });
      await civiApi4('LocBlock.delete', { where: [['id', '=', newLocBlockId]] });
      await civiApi4('Address.delete', { where: [['id', '=', newLocBlock.address_id]] });
    }

    // Switching away from the origin location recreates its orphaned data as
    // a fresh LocBlock (a new id - see
    // _eventmanagelocations_restore_locblock_if_deleted()), so look it up by
    // name rather than reusing the id captured before the switch, which no
    // longer exists.
    const currentOriginLocBlockId = await getLocBlockIdByLocationName(originLocationName);
    await civiApi4('LocBlock.delete', { where: [['id', '=', currentOriginLocBlockId]] });
    await civiApi4('Address.delete', { where: [['name', '=', originLocationName]] });
  });

  test('switching to Create new location blanks the fields, and saving a new location leaves the original location untouched', async ({ privilegedPage }) => {
    await gotoEventLocationTab(privilegedPage, eventId);

    // Starts on "Use existing location" with the origin location
    // selected/frozen. Scoped to the frozen address block, not the whole
    // page - the #loc_event_id dropdown's own option list (and
    // crm-select2's "chosen" display) also contains this same address text
    // as part of the origin location's combined "name :: street :: city"
    // label.
    await expect(privilegedPage.locator('input[type="radio"][name="location_option"][value="2"]')).toBeChecked();
    await expect(privilegedPage.locator('#Address_Block_1').getByText(originStreetAddress)).toBeVisible();

    await privilegedPage.locator('input[type="radio"][name="location_option"][value="1"]').check();
    await privilegedPage.waitForLoadState('networkidle');

    const streetInput = privilegedPage.locator('input[name="address[1][street_address]"]');
    const cityInput = privilegedPage.locator('input[name="address[1][city]"]');

    // Blank, not just re-showing the origin location's data.
    await expect(streetInput).toHaveValue('');
    await expect(cityInput).toHaveValue('');
    await expect(streetInput).not.toHaveValue(originStreetAddress);
    await expect(cityInput).not.toHaveValue(originCity);

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

    await privilegedPage.getByRole('button', { name: 'Save' }).first().click();
    await privilegedPage.waitForLoadState('networkidle');

    // The origin location's data must still exist somewhere in the pool,
    // completely unchanged - this is the historical bug: saving used to
    // silently overwrite/delete it instead of creating an independent new
    // location. Switching an event away from an existing location recreates
    // the orphaned side as a fresh LocBlock (a new id; the original's is
    // gone for good, per _eventmanagelocations_restore_locblock_if_deleted()),
    // so look it up by name rather than by the id captured before the switch.
    const originLocBlockAfterId = await getLocBlockIdByLocationName(originLocationName);
    const originAddressAfter = await getAddressByLocBlockId<{ street_address: string; city: string }>(originLocBlockAfterId, ['street_address', 'city']);
    expect(originAddressAfter.street_address).toBe(originStreetAddress);
    expect(originAddressAfter.city).toBe(originCity);

    // The event now points at a brand-new, independent LocBlock with the
    // freshly entered details.
    const event = await civiApi4Single<{ loc_block_id: number }>('Event.get', {
      where: [['id', '=', eventId]],
      select: ['loc_block_id'],
    });
    expect(event.loc_block_id).not.toBe(originLocBlockAfterId);
    newLocBlockId = event.loc_block_id;

    const newAddress = await getAddressByLocBlockId<{ street_address: string; city: string }>(event.loc_block_id, ['street_address', 'city']);
    expect(newAddress.street_address).toBe('50 Regression Street');
    expect(newAddress.city).toBe('Adelaide');
  });
});
