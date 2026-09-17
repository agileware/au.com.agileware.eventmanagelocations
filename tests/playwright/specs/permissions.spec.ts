import { test, expect, gotoEventLocationTab, editLocationUrl, civiAdminUrl } from '../fixtures/base';
import { civiApi4Single, getEventIdByTitle, getLocBlockIdByLocationName, getAddressByLocBlockId } from '../fixtures/civi';
import testData from '../fixtures/test-data.json';

/**
 * Test plan Suite A (permission-gated visibility) and Suite I (permission
 * definition).
 */

test.describe('Permission-gated visibility', () => {
  test('privileged user sees both Use existing location and Create new location', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);
    await gotoEventLocationTab(privilegedPage, eventId);

    await expect(privilegedPage.locator('input[type="radio"][name="location_option"][value="2"]')).toBeVisible();
    await expect(privilegedPage.locator('input[type="radio"][name="location_option"][value="1"]')).toBeVisible();
    await expect(privilegedPage.getByText('Use existing location')).toBeVisible();
    await expect(privilegedPage.getByText('Create new location')).toBeVisible();
  });

  test('non-privileged user only sees Use existing location, no radio and no create option', async ({ nonPrivilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.blankOne.title);
    await gotoEventLocationTab(nonPrivilegedPage, eventId);

    // Only one choice is available - forced via a hidden field, not a radio.
    await expect(nonPrivilegedPage.locator('input[type="radio"][name="location_option"]')).toHaveCount(0);
    await expect(nonPrivilegedPage.getByText('Create new location')).toHaveCount(0);
    await expect(nonPrivilegedPage.locator('#loc_event_id')).toBeVisible();
  });

  test('non-privileged user cannot reach an editable EditLocation form, and a crafted POST changes nothing', async ({ nonPrivilegedPage }) => {
    const locBlockId = await getLocBlockIdByLocationName(testData.locations.a.name);
    await nonPrivilegedPage.goto(editLocationUrl(locBlockId));

    // Frozen: no Save button, and the street address is not a live, editable input.
    await expect(nonPrivilegedPage.getByRole('button', { name: 'Save' })).toHaveCount(0);
    const streetInput = nonPrivilegedPage.locator('input[name="address[1][street_address]"]');
    if (await streetInput.count()) {
      await expect(streetInput).toBeDisabled();
    }

    const before = await getAddressByLocBlockId<{ street_address: string }>(locBlockId, ['street_address']);

    // Attempt a crafted POST to the frozen form directly, bypassing the UI.
    const response = await nonPrivilegedPage.request.post(editLocationUrl(locBlockId), {
      form: {
        'address[1][street_address]': 'Hacked Street',
        qfKey: 'invalid',
      },
    });
    expect(response.status()).toBeLessThan(500);

    const after = await getAddressByLocBlockId<{ street_address: string }>(locBlockId, ['street_address']);
    expect(after.street_address).toBe(before.street_address);
  });

  test('privileged user sees the Edit Location link for the currently selected location', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.withLocationA.title);
    const locBlockId = await getLocBlockIdByLocationName(testData.locations.a.name);
    await gotoEventLocationTab(privilegedPage, eventId);

    const link = privilegedPage.locator('#eventmanagelocations-edit-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', new RegExp(`bid=${locBlockId}\\b`));
  });
});

test.describe('Permission definition', () => {
  test('edit locations permission appears correctly in Access Control', async ({ adminPage }) => {
    await adminPage.goto(civiAdminUrl('civicrm/admin/access/wp-permissions', { reset: 1 }));
    await expect(adminPage.getByText('Event manage locations: edit locations')).toBeVisible();
    await expect(adminPage.getByText('Allows users to edit event locations')).toBeVisible();
  });
});
