import { test, expect, gotoEventLocationTab } from '../fixtures/base';
import { civiApi4, civiApi4Single, getEventIdByTitle, getLocBlockIdByLocationName, getAddressByLocBlockId } from '../fixtures/civi';
import testData from '../fixtures/test-data.json';

/**
 * Test plan Suite D: switching between options/locations (reload &
 * state-consistency regressions).
 */

test.describe('Switching between location options', () => {
  test('toggling Use existing -> Create new -> Use existing re-renders frozen vs editable state each time, without a Leave site? dialog', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);

    const dialogs: string[] = [];
    privilegedPage.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      dialog.dismiss();
    });

    await gotoEventLocationTab(privilegedPage, eventId);

    // Use existing location - frozen/read-only.
    await privilegedPage.locator('input[type="radio"][name="location_option"][value="2"]').check();
    await privilegedPage.waitForLoadState('networkidle');
    const existingStreetInput = privilegedPage.locator('input[name="address[1][street_address]"]');
    if (await existingStreetInput.count()) {
      await expect(existingStreetInput).toBeDisabled();
    }

    // Create new location - editable, blank fields, not stuck frozen.
    await privilegedPage.locator('input[type="radio"][name="location_option"][value="1"]').check();
    await privilegedPage.waitForLoadState('networkidle');
    const newStreetInput = privilegedPage.locator('input[name="address[1][street_address]"]');
    await expect(newStreetInput).toBeEnabled();
    await expect(newStreetInput).toHaveValue('');

    // Back to Use existing location - frozen again, not stuck editable.
    await privilegedPage.locator('input[type="radio"][name="location_option"][value="2"]').check();
    await privilegedPage.waitForLoadState('networkidle');
    const backStreetInput = privilegedPage.locator('input[name="address[1][street_address]"]');
    if (await backStreetInput.count()) {
      await expect(backStreetInput).toBeDisabled();
    }

    expect(dialogs).toHaveLength(0);
  });

  test('switching between two existing locations shows each location\'s real address, not stale data from the previous selection', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);
    const locBlockBId = await getLocBlockIdByLocationName(testData.locations.b.name);
    const locBlockCId = await getLocBlockIdByLocationName(testData.locations.c.name);

    await gotoEventLocationTab(privilegedPage, eventId);

    await privilegedPage.locator('#loc_event_id').selectOption(String(locBlockBId), { force: true });
    await privilegedPage.waitForLoadState('networkidle');
    await expect(privilegedPage.getByText(testData.locations.b.street_address)).toBeVisible();
    await expect(privilegedPage.getByText(testData.locations.b.city)).toBeVisible();
    await expect(privilegedPage.getByText(testData.locations.c.street_address)).toHaveCount(0);

    await privilegedPage.locator('#loc_event_id').selectOption(String(locBlockCId), { force: true });
    await privilegedPage.waitForLoadState('networkidle');
    await expect(privilegedPage.getByText(testData.locations.c.street_address)).toBeVisible();
    await expect(privilegedPage.getByText(testData.locations.c.city)).toBeVisible();
    await expect(privilegedPage.getByText(testData.locations.b.street_address)).toHaveCount(0);

    // Not saved - blankOne remains without a persisted location for other specs.
  });

  test('non-privileged user switching between two existing locations shows each location\'s real address, not stale data', async ({ nonPrivilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);
    const locBlockBId = await getLocBlockIdByLocationName(testData.locations.b.name);
    const locBlockCId = await getLocBlockIdByLocationName(testData.locations.c.name);

    await gotoEventLocationTab(nonPrivilegedPage, eventId);

    await nonPrivilegedPage.locator('#loc_event_id').selectOption(String(locBlockBId), { force: true });
    await nonPrivilegedPage.waitForLoadState('networkidle');
    await expect(nonPrivilegedPage.getByText(testData.locations.b.street_address)).toBeVisible();
    await expect(nonPrivilegedPage.getByText(testData.locations.c.street_address)).toHaveCount(0);

    await nonPrivilegedPage.locator('#loc_event_id').selectOption(String(locBlockCId), { force: true });
    await nonPrivilegedPage.waitForLoadState('networkidle');
    await expect(nonPrivilegedPage.getByText(testData.locations.c.street_address)).toBeVisible();
    await expect(nonPrivilegedPage.getByText(testData.locations.b.street_address)).toHaveCount(0);

    // Not saved - blankOne remains without a persisted location for other specs.
  });
});

test.describe('Switching between location options - regression: saving after switching existing locations', () => {
  test.describe.configure({ mode: 'serial' });

  let regressionEventId: number;
  let locBlockBId: number;
  let locBlockCId: number;

  test.beforeAll(async () => {
    locBlockBId = await getLocBlockIdByLocationName(testData.locations.b.name);
    locBlockCId = await getLocBlockIdByLocationName(testData.locations.c.name);

    // A dedicated throwaway event, created directly via the API, so this
    // regression check doesn't depend on or mutate the shared seed events.
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const created = await civiApi4Single<{ id: number }>('Event.create', {
      values: {
        title: 'EML Regression D3 Event',
        'event_type_id:name': 'Meeting',
        start_date: futureDate.toISOString().slice(0, 10),
        loc_block_id: locBlockBId,
      },
    });
    regressionEventId = created.id;
  });

  test.afterAll(async () => {
    // Event.delete does not cascade-delete the LocBlock - locations persist
    // independent of events, which is the whole point of this extension.
    await civiApi4('Event.delete', { where: [['id', '=', regressionEventId]] });
  });

  test('switching between existing locations and saving attaches the real target, without creating a duplicate LocBlock', async ({ privilegedPage }) => {
    const dialogs: string[] = [];
    privilegedPage.on('dialog', (dialog) => {
      dialogs.push(dialog.message());
      dialog.dismiss();
    });

    await gotoEventLocationTab(privilegedPage, regressionEventId);

    await privilegedPage.locator('#loc_event_id').selectOption(String(locBlockCId), { force: true });
    await privilegedPage.waitForLoadState('networkidle');
    await privilegedPage.getByRole('button', { name: 'Save' }).first().click();
    await privilegedPage.waitForLoadState('networkidle');

    const event = await civiApi4Single<{ loc_block_id: number }>('Event.get', {
      where: [['id', '=', regressionEventId]],
      select: ['loc_block_id'],
    });
    expect(event.loc_block_id).toBe(locBlockCId);

    // Location B must still exist, unmodified - not deleted or altered.
    const locationB = await getAddressByLocBlockId<{ street_address: string; city: string }>(locBlockBId, ['street_address', 'city']);
    expect(locationB.street_address).toBe(testData.locations.b.street_address);
    expect(locationB.city).toBe(testData.locations.b.city);

    // No bogus duplicate LocBlock was created for Location C's address.
    const locationCMatches = await civiApi4<Array<{ id: number }>>('LocBlock.get', {
      where: [['address_id.name', '=', testData.locations.c.name]],
      select: ['id'],
    });
    expect(locationCMatches).toHaveLength(1);

    expect(dialogs).toHaveLength(0);
  });
});
