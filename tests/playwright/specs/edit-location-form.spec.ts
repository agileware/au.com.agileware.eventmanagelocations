import { test, expect, gotoEventLocationTab, editLocationUrl, MANAGE_EVENT_LOCATIONS_URL } from '../fixtures/base';
import { civiApi4, civiApi4Single, getEventIdByTitle, getLocBlockIdByLocationName, getAddressByLocBlockId } from '../fixtures/civi';
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
  // A dedicated throwaway LocBlock, shared by two throwaway Events of its
  // own - not the shared Location A fixture other spec files read
  // concurrently. Mutating Location A's address here (even temporarily,
  // restored via an afterEach) races those other, parallel reads.
  test('saving a change to a shared LocBlock propagates to every Event sharing it', async ({ privilegedPage }) => {
    const locationTypeId = civiApi4Single<{ id: number }>('LocationType.get', {
      where: [['is_default', '=', true]],
      select: ['id'],
    }).id;
    const address = civiApi4Single<{ id: number }>('Address.create', {
      values: { street_address: `${Date.now()} EML Shared Save Test Street`, city: 'Hobart', location_type_id: locationTypeId },
    });
    const email = civiApi4Single<{ id: number }>('Email.create', {
      values: { email: `emlsharedsavetest${Date.now()}@example.test`, location_type_id: locationTypeId },
    });
    const phone = civiApi4Single<{ id: number }>('Phone.create', {
      values: { phone: '0311122255', location_type_id: locationTypeId },
    });
    const locBlock = civiApi4Single<{ id: number }>('LocBlock.create', {
      values: { address_id: address.id, email_id: email.id, phone_id: phone.id },
    });

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const eventValues = {
      'event_type_id:name': 'Meeting',
      start_date: futureDate.toISOString().slice(0, 10),
      loc_block_id: locBlock.id,
    };
    const eventA = civiApi4Single<{ id: number }>('Event.create', { values: { title: 'EML Throwaway Shared Save A', ...eventValues } });
    const eventB = civiApi4Single<{ id: number }>('Event.create', { values: { title: 'EML Throwaway Shared Save B', ...eventValues } });

    try {
      const tempStreetAddress = `TEMP ${Date.now()} Test Street`;

      await privilegedPage.goto(editLocationUrl(locBlock.id));
      await privilegedPage.locator('input[name="address[1][street_address]"]').fill(tempStreetAddress);
      await privilegedPage.getByRole('button', { name: 'Save' }).first().click();
      await privilegedPage.waitForLoadState('networkidle');

      const updated = getAddressByLocBlockId<{ street_address: string }>(locBlock.id, ['street_address']);
      expect(updated.street_address).toBe(tempStreetAddress);

      // eventB shares this exact LocBlock - re-fetch the Address via its own
      // loc_block_id to demonstrate the propagation, not just that the
      // LocBlock edited directly changed.
      const eventBFetched = civiApi4Single<{ loc_block_id: number }>('Event.get', {
        where: [['id', '=', eventB.id]],
        select: ['loc_block_id'],
      });
      expect(eventBFetched.loc_block_id).toBe(locBlock.id);

      const viaEvent = getAddressByLocBlockId<{ street_address: string }>(eventBFetched.loc_block_id, ['street_address']);
      expect(viaEvent.street_address).toBe(tempStreetAddress);
    } finally {
      civiApi4('Event.delete', { where: [['id', '=', eventA.id]] });
      civiApi4('Event.delete', { where: [['id', '=', eventB.id]] });
      // Our own hook_civicrm_pre::Event listener detaches loc_block_id
      // before core's delete cleanup runs, so the LocBlock survives both
      // event deletes above and needs its own explicit cleanup here.
      civiApi4('LocBlock.delete', { where: [['id', '=', locBlock.id]] });
      civiApi4('Address.delete', { where: [['id', '=', address.id]] });
      civiApi4('Email.delete', { where: [['id', '=', email.id]] });
      civiApi4('Phone.delete', { where: [['id', '=', phone.id]] });
    }
  });
});

test.describe('Non-privileged users see a frozen, read-only form', () => {
  test('no Save button, and the street address is not a live, editable input', async ({ nonPrivilegedPage }) => {
    const locBlockId = getLocBlockIdByLocationName(testData.locations.a.name);
    await nonPrivilegedPage.goto(editLocationUrl(locBlockId));

    await expect(nonPrivilegedPage.getByRole('button', { name: 'Save' })).toHaveCount(0);

    const streetInput = nonPrivilegedPage.locator('input[name="address[1][street_address]"]');
    if (await streetInput.count()) {
      await expect(streetInput).toHaveAttribute('type', 'hidden');
    }
  });

  test('no Delete button either', async ({ nonPrivilegedPage }) => {
    const locBlockId = getLocBlockIdByLocationName(testData.locations.a.name);
    await nonPrivilegedPage.goto(editLocationUrl(locBlockId));

    await expect(nonPrivilegedPage.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  });
});

test.describe('Deleting a location from this form', () => {
  test('a new, unattached location has no Delete button - there is nothing to delete yet', async ({ privilegedPage }) => {
    await privilegedPage.goto(editLocationUrl());
    await expect(privilegedPage.getByRole('button', { name: 'Delete' })).toHaveCount(0);
  });

  test('the Delete button appears alongside Save, top and bottom, with no Cancel button', async ({ privilegedPage }) => {
    const locBlockId = getLocBlockIdByLocationName(testData.locations.a.name);
    await privilegedPage.goto(editLocationUrl(locBlockId));

    await expect(privilegedPage.getByRole('button', { name: 'Save' })).toHaveCount(2);
    await expect(privilegedPage.getByRole('button', { name: 'Delete' })).toHaveCount(2);
    await expect(privilegedPage.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  });

  test('the Delete button removes the LocBlock and its Address/Email/Phone, and returns to the listing', async ({ privilegedPage }) => {
    const locationTypeId = civiApi4Single<{ id: number }>('LocationType.get', {
      where: [['is_default', '=', true]],
      select: ['id'],
    }).id;
    const address = civiApi4Single<{ id: number }>('Address.create', {
      values: { street_address: `${Date.now()} EML Delete Button Street`, city: 'Perth', location_type_id: locationTypeId },
    });
    const email = civiApi4Single<{ id: number }>('Email.create', {
      values: { email: `emldeletebutton${Date.now()}@example.test`, location_type_id: locationTypeId },
    });
    const phone = civiApi4Single<{ id: number }>('Phone.create', {
      values: { phone: '0311122266', location_type_id: locationTypeId },
    });
    const locBlock = civiApi4Single<{ id: number }>('LocBlock.create', {
      values: { address_id: address.id, email_id: email.id, phone_id: phone.id },
    });

    privilegedPage.on('dialog', (dialog) => dialog.accept());

    await privilegedPage.goto(editLocationUrl(locBlock.id));
    await privilegedPage.getByRole('button', { name: 'Delete' }).first().click();
    await privilegedPage.waitForLoadState('networkidle');

    expect(privilegedPage.url()).toContain('q=civicrm%2Fmanage-event-locations');

    expect(civiApi4<Array<{ id: number }>>('LocBlock.get', { where: [['id', '=', locBlock.id]], select: ['id'] })).toHaveLength(0);
    expect(civiApi4<Array<{ id: number }>>('Address.get', { where: [['id', '=', address.id]], select: ['id'] })).toHaveLength(0);
    expect(civiApi4<Array<{ id: number }>>('Email.get', { where: [['id', '=', email.id]], select: ['id'] })).toHaveLength(0);
    expect(civiApi4<Array<{ id: number }>>('Phone.get', { where: [['id', '=', phone.id]], select: ['id'] })).toHaveLength(0);
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
    await privilegedPage.getByRole('button', { name: 'Save' }).first().click();
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
