import { test, expect, gotoEventLocationTab, selectExistingLocation, MANAGE_EVENT_LOCATIONS_URL } from '../fixtures/base';
import { civiApi4, civiApi4Single, getEventIdByTitle, getLocBlockIdByLocationName, getAddressByLocBlockId } from '../fixtures/civi';
import testData from '../fixtures/test-data.json';

/**
 * Test plan Suite B: Use existing location (all users).
 */

test.describe('Use existing location', () => {
  // Playwright's test runner resolves fixtures by statically parsing the
  // destructured parameter names, so each fixture needs its own literal
  // `async ({ privilegedPage }) => {...}` - a loop over a dynamic fixture
  // name can't be destructured as `{ [pageFixture]: page }`.
  async function assertsReadOnlyExistingLocation(page: import('@playwright/test').Page) {
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);
    const locBlockId = await getLocBlockIdByLocationName(testData.locations.b.name);
    await selectExistingLocation(page, eventId, locBlockId);

    // Scoped to the frozen address block, not the whole page - the
    // #loc_event_id dropdown's own option list (and crm-select2's "chosen"
    // display) also contains this same address text as part of each
    // location's combined "name :: street :: city" label.
    const addressBlock = page.locator('#Address_Block_1');
    await expect(addressBlock.getByText(testData.locations.b.street_address)).toBeVisible();
    await expect(addressBlock.getByText(testData.locations.b.city)).toBeVisible();

    const streetInput = page.locator('input[name="address[1][street_address]"]');
    if (await streetInput.count()) {
      await expect(streetInput).toHaveAttribute('type', 'hidden');
    }

    await expect(page.getByText('Existing Location Selected')).toBeVisible();
    // Regression: core's own "This location is used by N other events..." message must not appear.
    await expect(page.getByText(/used by \d+ other event/i)).toHaveCount(0);
  }

  test('privileged user selecting an existing location loads its real address read-only', async ({ privilegedPage }) => {
    await assertsReadOnlyExistingLocation(privilegedPage);
  });

  test('non-privileged user selecting an existing location loads its real address read-only', async ({ nonPrivilegedPage }) => {
    await assertsReadOnlyExistingLocation(nonPrivilegedPage);
  });

  test('help text mentions the Edit Location link for privileged users, and omits it for non-privileged users', async ({
    privilegedPage,
    nonPrivilegedPage,
  }) => {
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);
    const locBlockId = await getLocBlockIdByLocationName(testData.locations.b.name);

    await selectExistingLocation(privilegedPage, eventId, locBlockId);
    await expect(privilegedPage.getByText(/Edit Location link/i)).toBeVisible();

    await selectExistingLocation(nonPrivilegedPage, eventId, locBlockId);
    await expect(nonPrivilegedPage.getByText(/Edit Location link/i)).toHaveCount(0);
  });

  test('saving with an existing location selected attaches the event without modifying the location', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.blankTwo.title);
    const locBlockId = await getLocBlockIdByLocationName(testData.locations.c.name);

    const before = await getAddressByLocBlockId<{ street_address: string; city: string }>(locBlockId, ['street_address', 'city']);

    await selectExistingLocation(privilegedPage, eventId, locBlockId);
    await privilegedPage.getByRole('button', { name: 'Save' }).first().click();
    await privilegedPage.waitForLoadState('networkidle');

    const event = await civiApi4Single<{ loc_block_id: number }>('Event.get', {
      where: [['id', '=', eventId]],
      select: ['loc_block_id'],
    });
    expect(event.loc_block_id).toBe(locBlockId);

    const after = await getAddressByLocBlockId<{ street_address: string; city: string }>(locBlockId, ['street_address', 'city']);
    expect(after).toEqual(before);

    // No duplicate LocBlock rows were created for this address.
    const duplicateCount = await civiApi4<Array<{ id: number }>>('LocBlock.get', {
      where: [['address_id.name', '=', testData.locations.c.name]],
      select: ['id'],
    });
    expect(duplicateCount).toHaveLength(1);
  });

  test('Use existing location lists the full pool, matching Manage Event Locations', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);
    await gotoEventLocationTab(privilegedPage, eventId);

    const options = await privilegedPage.locator('#loc_event_id option').allTextContents();
    for (const location of Object.values(testData.locations)) {
      expect(options.some((text) => text.includes(location.name))).toBe(true);
    }

    await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
    await privilegedPage.waitForLoadState('networkidle');
    for (const location of Object.values(testData.locations)) {
      await expect(privilegedPage.getByText(location.name)).toBeVisible();
    }
  });
});
