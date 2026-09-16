<?php

use Civi\Api4\LocBlock;

/**
 * Helpers for listing existing, reusable event locations.
 */
class CRM_Eventmanagelocations_BAO_LocBlock {

  /**
   * All LocBlocks with an address, regardless of whether any Event
   * currently uses them.
   *
   * Unlike CRM_Event_BAO_Event::getLocationEvents(), which only returns
   * LocBlocks already attached to an Event (so a location created ahead of
   * time via "Manage Event Locations" would never be selectable anywhere),
   * this queries LocBlock/Address directly.
   *
   * @return array
   *   LocBlock ID => formatted address label.
   */
  public static function getAllLocations(): array {
    $fields = [
      'address_id.name',
      'address_id.street_address',
      'address_id.supplemental_address_1',
      'address_id.supplemental_address_2',
      'address_id.supplemental_address_3',
      'address_id.city',
      'address_id.state_province_id.name',
    ];

    $locBlocks = LocBlock::get(FALSE)
      ->addSelect('id', ...$fields)
      ->addWhere('address_id', 'IS NOT NULL')
      ->addOrderBy('id')
      ->execute();

    $locations = [];
    foreach ($locBlocks as $locBlock) {
      $address = '';
      foreach ($fields as $field) {
        if (!empty($locBlock[$field])) {
          $address .= ($address ? ' :: ' : '') . $locBlock[$field];
        }
      }
      $locations[$locBlock['id']] = $address ?: ts('(Location %1)', [1 => $locBlock['id']]);
    }

    return CRM_Utils_Array::asort($locations);
  }

  /**
   * The address fields for a LocBlock, keyed the way
   * CRM_Contact_Form_Edit_Address's form fields (and $form->_values) expect.
   *
   * CRM_Event_Form_ManageEvent_Location::preProcess() tries to populate
   * $this->_values['address'] via CRM_Core_BAO_Address::getValues() keyed on
   * entity_table/entity_id, but a LocBlock-owned address isn't linked that
   * way (civicrm_address has no entity_table/entity_id columns) - so it
   * always comes back empty, even though the email/phone traits do
   * correctly load their data straight off the LocBlock. This is the
   * equivalent direct lookup for address.
   *
   * @param int $locBlockId
   *
   * @return array
   *   Address field name => value, or [] if the LocBlock has no address.
   */
  public static function getAddressDefaults(int $locBlockId): array {
    $locBlock = LocBlock::get(FALSE)
      ->addSelect('address_id.*')
      ->addWhere('id', '=', $locBlockId)
      ->execute()->first();

    if (empty($locBlock['address_id.id'])) {
      return [];
    }

    $address = [];
    foreach ($locBlock as $key => $value) {
      if (str_starts_with($key, 'address_id.') && $value !== NULL) {
        $address[substr($key, strlen('address_id.'))] = $value;
      }
    }
    return $address;
  }

}
