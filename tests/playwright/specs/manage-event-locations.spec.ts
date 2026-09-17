import { test, expect, editLocationUrl, MANAGE_EVENT_LOCATIONS_URL } from '../fixtures/base';
import { civiApi4, civiApi4Single } from '../fixtures/civi';
import testData from '../fixtures/test-data.json';

/**
 * Test plan Suite G: Manage Event Locations (SearchKit screen).
 *
 * Grounded against managed/SavedSearch_ManageEventLocations.mgd.php and
 * ang/afsearchManageEventLocations.aff.html: the table's row-actions column
 * has no header text and renders its three links inline (no `fa-bars`
 * menu trigger to open first) - "Edit Location" (plain navigation to
 * civicrm/EditLocation?bid=[id]),
 * "Update Address" and "Delete Address" (both open a `crm-popup` SearchKit
 * task dialog against the joined Address record). The filter fields above
 * the table are afform fields labelled exactly "Address Name", "Street
 * Address", "City", "Country" and "State/Province".
 */

async function getDefaultLocationTypeId(): Promise<number> {
  const types = civiApi4<Array<{ id: number }>>('LocationType.get', {
    where: [['is_default', '=', true]],
    select: ['id'],
  });
  return types[0]?.id ?? 1;
}

async function createThrowawayLocation(name: string, streetAddress: string, city = 'Perth') {
  const locationTypeId = await getDefaultLocationTypeId();

  const address = civiApi4Single<{ id: number }>('Address.create', {
    values: {
      name,
      street_address: streetAddress,
      city,
      location_type_id: locationTypeId,
    },
  });
  const email = civiApi4Single<{ id: number }>('Email.create', {
    values: {
      email: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}@example.test`,
      location_type_id: locationTypeId,
    },
  });
  const phone = civiApi4Single<{ id: number }>('Phone.create', {
    values: {
      phone: '0311122244',
      location_type_id: locationTypeId,
    },
  });
  const locBlock = civiApi4Single<{ id: number }>('LocBlock.create', {
    values: {
      address_id: address.id,
      email_id: email.id,
      phone_id: phone.id,
    },
  });

  return { locBlockId: locBlock.id, addressId: address.id, emailId: email.id, phoneId: phone.id };
}

test.describe('Manage Event Locations listing', () => {
  test('lists every location that has an address on file, whether or not an Event currently uses it', async ({ privilegedPage }) => {
    await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
    await privilegedPage.waitForLoadState('networkidle');

    for (const location of Object.values(testData.locations)) {
      await expect(privilegedPage.getByText(location.name)).toBeVisible();
    }
  });

  test('filtering by City narrows the table to only the matching location', async ({ privilegedPage }) => {
    await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
    await privilegedPage.waitForLoadState('networkidle');

    // Best-effort: the filter above the table is an afform field labelled
    // "City" (see ang/afsearchManageEventLocations.aff.html). getByLabel
    // alone also matches an unrelated "City" radio button in the page's own
    // advanced-search field picker, so scope to the textbox role. If the
    // label isn't wired up as expected, fall back to any visible textbox.
    let cityFilter = privilegedPage.getByRole('textbox', { name: 'City', exact: true });
    if (!(await cityFilter.count())) {
      cityFilter = privilegedPage.getByRole('textbox').first();
    }
    await cityFilter.fill(testData.locations.b.city);
    await privilegedPage.keyboard.press('Enter');
    await privilegedPage.waitForLoadState('networkidle');

    await expect(privilegedPage.getByText(testData.locations.b.name)).toBeVisible();
    await expect(privilegedPage.getByText(testData.locations.a.name)).toHaveCount(0);
    await expect(privilegedPage.getByText(testData.locations.c.name)).toHaveCount(0);
  });

  test.describe('Edit Location row action', () => {
    test("navigates to civicrm/EditLocation?bid=ID pre-filled with that location's data", async ({ privilegedPage }) => {
      const locBlockId = civiApi4Single<{ id: number }>('LocBlock.get', {
        where: [['address_id.name', '=', testData.locations.c.name]],
        select: ['id'],
      }).id;

      await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
      await privilegedPage.waitForLoadState('networkidle');

      const row = privilegedPage.locator('tr', { hasText: testData.locations.c.name });
      await row.getByRole('link', { name: 'Edit Location' }).click();
      await privilegedPage.waitForLoadState('networkidle');

      expect(privilegedPage.url()).toContain(`bid=${locBlockId}`);
      await expect(privilegedPage.locator('input[name="address[1][street_address]"]')).toHaveValue(
        testData.locations.c.street_address
      );
    });

    // Cross-references permissions.spec.ts, which checks this same frozen
    // behaviour for Location A - Location C here is deliberately a
    // different location, read from testData rather than a hardcoded id.
    test('is editable only for privileged users - a non-privileged user sees no Save button', async ({ nonPrivilegedPage }) => {
      const locBlockId = civiApi4Single<{ id: number }>('LocBlock.get', {
        where: [['address_id.name', '=', testData.locations.c.name]],
        select: ['id'],
      }).id;

      await nonPrivilegedPage.goto(editLocationUrl(locBlockId));
      await expect(nonPrivilegedPage.getByRole('button', { name: 'Save' })).toHaveCount(0);
    });
  });

  test.describe.serial('Update Address / Delete Address row actions', () => {
    // A throwaway LocBlock created solely for this destructive suite -
    // Locations A/B/C must never be targeted by Update/Delete here.
    let throwaway: { locBlockId: number; addressId: number };
    const name = `EML Throwaway Row Actions ${Date.now()}`;
    const originalStreetAddress = '50 Throwaway Street';
    const updatedCity = 'Darwin';

    test.beforeAll(async () => {
      throwaway = await createThrowawayLocation(name, originalStreetAddress);
    });

    test('Update Address row action edits the underlying Address record', async ({ privilegedPage }) => {
      await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
      await privilegedPage.waitForLoadState('networkidle');

      const row = privilegedPage.locator('tr', { hasText: name });
      await expect(row).toBeVisible();
      await row.getByRole('link', { name: 'Update Address' }).click();

      // SearchKit renders this as a crm-popup dialog with the Address's own
      // fields - best-effort on the exact dialog markup.
      const dialog = privilegedPage.locator('.crm-container .ui-dialog, .crm-popup').last();
      await expect(dialog).toBeVisible();

      const cityInput = dialog.locator('input[name="city"], input[name*="[city]"]').first();
      await cityInput.fill(updatedCity);
      await dialog.getByRole('button', { name: /save|update/i }).click();
      await privilegedPage.waitForLoadState('networkidle');

      const address = civiApi4Single<{ city: string }>('Address.get', {
        where: [['id', '=', throwaway.addressId]],
        select: ['city'],
      });
      expect(address.city).toBe(updatedCity);
    });

    test('Delete Address row action removes the underlying Address record', async ({ privilegedPage }) => {
      await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
      await privilegedPage.waitForLoadState('networkidle');

      const row = privilegedPage.locator('tr', { hasText: name });
      await expect(row).toBeVisible();
      await row.getByRole('link', { name: 'Delete Address' }).click();

      // Confirm the delete inside the popup dialog (style: danger).
      const dialog = privilegedPage.locator('.crm-container .ui-dialog, .crm-popup').last();
      await expect(dialog).toBeVisible();
      await dialog.getByRole('button', { name: /delete|yes|ok/i }).first().click();
      await privilegedPage.waitForLoadState('networkidle');

      const remaining = civiApi4<Array<{ id: number }>>('Address.get', {
        where: [['id', '=', throwaway.addressId]],
        select: ['id'],
      });
      expect(remaining).toHaveLength(0);
    });
  });

  test('Create a New Location toolbar button opens a blank Edit Location form', async ({ privilegedPage }) => {
    await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
    await privilegedPage.waitForLoadState('networkidle');

    await privilegedPage.getByRole('link', { name: 'Create a New Location' }).click();
    await privilegedPage.waitForLoadState('networkidle');

    // Admin-context CiviCRM pages are routed through wp-admin's URL-encoded
    // q= param (see civiAdminUrl() in fixtures/base.ts), not the plain
    // /civicrm/... path - that's only for genuinely public pages.
    expect(privilegedPage.url()).toContain('q=civicrm%2FEditLocation');
    expect(privilegedPage.url()).not.toMatch(/bid=\d/);

    await expect(privilegedPage.locator('input[name="address[1][street_address]"]')).toHaveValue('');
  });

  test('a newly created location appears in the listing without needing cache clears', async ({ privilegedPage }) => {
    const streetAddress = `${Date.now()} New Throwaway Street`;

    await privilegedPage.goto(editLocationUrl());
    await privilegedPage.locator('input[name="address[1][street_address]"]').fill(streetAddress);
    await privilegedPage.locator('input[name="address[1][city]"]').fill('Hobart');
    await privilegedPage.getByRole('button', { name: 'Save' }).first().click();
    await privilegedPage.waitForLoadState('networkidle');

    await privilegedPage.goto(MANAGE_EVENT_LOCATIONS_URL);
    await privilegedPage.waitForLoadState('networkidle');
    await expect(privilegedPage.getByText(streetAddress)).toBeVisible();

    // Clean up the throwaway LocBlock/Address created above.
    const locBlock = civiApi4Single<{ id: number; address_id: number }>('LocBlock.get', {
      where: [['address_id.street_address', '=', streetAddress]],
      select: ['id', 'address_id'],
    });
    civiApi4('LocBlock.delete', { where: [['id', '=', locBlock.id]] });
    civiApi4('Address.delete', { where: [['id', '=', locBlock.address_id]] });
  });
});
