import { test, expect, gotoEventLocationTab } from '../fixtures/base';
import { civiApi4, civiApi4Single, getLocBlockIdByLocationName } from '../fixtures/civi';
import testData from '../fixtures/test-data.json';

/**
 * Test plan Suite E (data integrity / pool persistence).
 *
 * Locations A/B/C and the seeded events are shared fixtures read by other
 * spec files - these tests only ever attach throwaway Events of their own to
 * the existing seeded LocBlocks, and always clean those throwaway Events up
 * afterwards. The seeded locations themselves are never mutated or deleted.
 */

function createThrowawayEvent(title: string, locBlockId: number) {
  return civiApi4Single<{ id: number }>('Event.create', {
    values: {
      title,
      'event_type_id:name': 'Meeting',
      start_date: '2030-01-01',
      is_active: true,
      is_public: true,
      loc_block_id: locBlockId,
    },
  });
}

test.describe('Data integrity - pool persistence', () => {
  test('deleting an event never cascade-deletes its shared location', async () => {
    const locBlockId = await getLocBlockIdByLocationName(testData.locations.b.name);

    const event = await createThrowawayEvent('EML Throwaway - Delete Cascade Check', locBlockId);
    await civiApi4('Event.delete', { where: [['id', '=', event.id]] });

    // Location B's LocBlock must still exist - deleting the event that
    // referenced it must never cascade-delete the shared location. Locations
    // are only ever removed via an explicit user action (e.g. "Delete
    // Address" on the Manage Event Locations screen).
    const stillThere = await civiApi4<Array<{ id: number }>>('LocBlock.get', {
      where: [['id', '=', locBlockId]],
      select: ['id'],
    });
    expect(stillThere).toHaveLength(1);
    expect(await getLocBlockIdByLocationName(testData.locations.b.name)).toBe(locBlockId);
  });

  test('switching an event to a different existing location leaves both locations intact with no orphans or duplicates', async ({ privilegedPage }) => {
    const locBlockCId = await getLocBlockIdByLocationName(testData.locations.c.name);
    const locBlockBId = await getLocBlockIdByLocationName(testData.locations.b.name);

    const nullAddressLocBlocksBefore = await civiApi4<Array<{ id: number }>>('LocBlock.get', {
      where: [['address_id', 'IS NULL']],
      select: ['id'],
    });

    const event = await createThrowawayEvent('EML Throwaway - Location Switch Check', locBlockCId);

    try {
      await gotoEventLocationTab(privilegedPage, event.id);
      await privilegedPage.locator('#loc_event_id').selectOption(String(locBlockBId));
      await privilegedPage.waitForLoadState('networkidle');
      await privilegedPage.getByRole('button', { name: 'Save' }).click();
      await privilegedPage.waitForLoadState('networkidle');

      const updated = await civiApi4Single<{ loc_block_id: number }>('Event.get', {
        where: [['id', '=', event.id]],
        select: ['loc_block_id'],
      });
      expect(updated.loc_block_id).toBe(locBlockBId);

      // Location C's own Address/Email/Phone must still be linked to its
      // LocBlock, not orphaned, even though no event currently points at it.
      const locBlockC = await civiApi4Single<{ address_id: number; email_id: number; phone_id: number }>('LocBlock.get', {
        where: [['id', '=', locBlockCId]],
        select: ['address_id', 'email_id', 'phone_id'],
      });
      expect(locBlockC.address_id).not.toBeNull();
      expect(locBlockC.email_id).not.toBeNull();
      expect(locBlockC.phone_id).not.toBeNull();

      const addressC = await civiApi4Single<{ id: number; name: string }>('Address.get', {
        where: [['id', '=', locBlockC.address_id]],
        select: ['id', 'name'],
      });
      expect(addressC.name).toBe(testData.locations.c.name);

      // No LocBlock rows with a NULL address_id have unexpectedly appeared.
      const nullAddressLocBlocksAfter = await civiApi4<Array<{ id: number }>>('LocBlock.get', {
        where: [['address_id', 'IS NULL']],
        select: ['id'],
      });
      expect(nullAddressLocBlocksAfter).toHaveLength(nullAddressLocBlocksBefore.length);

      // No duplicate LocBlocks point at Location C's Address.
      const locBlocksOnCAddress = await civiApi4<Array<{ id: number }>>('LocBlock.get', {
        where: [['address_id', '=', locBlockC.address_id]],
        select: ['id'],
      });
      expect(locBlocksOnCAddress).toHaveLength(1);

      // No duplicate LocBlocks point at Location B's Address.
      const locBlockB = await civiApi4Single<{ address_id: number }>('LocBlock.get', {
        where: [['id', '=', locBlockBId]],
        select: ['address_id'],
      });
      const locBlocksOnBAddress = await civiApi4<Array<{ id: number }>>('LocBlock.get', {
        where: [['address_id', '=', locBlockB.address_id]],
        select: ['id'],
      });
      expect(locBlocksOnBAddress).toHaveLength(1);
    } finally {
      await civiApi4('Event.delete', { where: [['id', '=', event.id]] });
    }
  });

  test.describe('every seeded location has non-NULL location_type_id on all its components', () => {
    for (const location of Object.values(testData.locations)) {
      test(`Location "${location.name}"`, async () => {
        const locBlock = await civiApi4Single<{ address_id: number; email_id: number; phone_id: number }>('LocBlock.get', {
          where: [['address_id.name', '=', location.name]],
          select: ['address_id', 'email_id', 'phone_id'],
        });

        const address = await civiApi4Single<{ location_type_id: number | null }>('Address.get', {
          where: [['id', '=', locBlock.address_id]],
          select: ['location_type_id'],
        });
        expect(address.location_type_id).not.toBeNull();

        const email = await civiApi4Single<{ location_type_id: number | null }>('Email.get', {
          where: [['id', '=', locBlock.email_id]],
          select: ['location_type_id'],
        });
        expect(email.location_type_id).not.toBeNull();

        const phone = await civiApi4Single<{ location_type_id: number | null }>('Phone.get', {
          where: [['id', '=', locBlock.phone_id]],
          select: ['location_type_id'],
        });
        expect(phone.location_type_id).not.toBeNull();
      });
    }
  });
});
