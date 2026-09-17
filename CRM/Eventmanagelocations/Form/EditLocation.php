<?php

require_once 'CRM/Core/Form.php';

use Civi\Api4\Address;
use Civi\Api4\Email;
use Civi\Api4\LocBlock;
use Civi\Api4\Phone;

/**
 * Form controller class
 *
 * @see http://wiki.civicrm.org/confluence/display/CRMDOC43/QuickForm+Reference
 */
class CRM_Eventmanagelocations_Form_EditLocation extends CRM_Event_Form_ManageEvent_Location {
  public function preProcess() {
    parent::preProcess();

    //parent::preProcess() (CRM_Event_Form_ManageEvent) sets a "Manage
    //Events" breadcrumb pointing at civicrm/event/manage, which doesn't
    //make sense here since this form isn't part of that workflow. Replace
    //the whole trail with the standard CiviCRM >> <page> pattern.
    CRM_Utils_System::resetBreadCrumb();
    CRM_Utils_System::appendBreadCrumb(array(
      array(
        'title' => ts('CiviCRM'),
        'url' => CRM_Utils_System::url('civicrm/dashboard', 'reset=1'),
      ),
      array(
        'title' => ts('Manage Event Locations'),
        'url' => CRM_Utils_System::url('civicrm/manage-event-locations', 'reset=1'),
      ),
    ));

    if($bid = CRM_Utils_Request::retrieve('bid', 'Int')) {
      $_SESSION['loc_edt_bid'] = $bid;

      $this->assign('loc_edit_title',ts('Edit Location'));

      if (CRM_Utils_Request::retrieve('action', 'String') === 'delete') {
        // Deletes and redirects away; nothing below this point runs.
        $this->deleteLocation($bid);
      }

      if (CRM_Core_Permission::check('edit locations')) {
        $this->assign('loc_delete_url', CRM_Utils_System::url('civicrm/EditLocation', "bid={$bid}&action=delete", TRUE));
      }
    }
    else {
      $title = ts('New Location');

      CRM_Utils_System::setTitle($title);

      $this->assign('loc_edit_title',$title);

      return;
    }

    if(empty($this->_values) || isset($bid)) {
      $this->_values = array(
        'address' => array(),
        'email' => array(),
        'phone' => array(),
      );

      // check_permissions is off deliberately: this LocBlock isn't attached
      // to a contact, and if it's already attached to an Event, APIv4's ACL
      // scoping for LocBlock/Address/Email/Phone filters by that Event's own
      // view permission - which even a user with this page's own "edit
      // locations" permission (already the gate for reaching this form,
      // checked below) may not separately hold, wrongly turning a real
      // LocBlock into "found 0". LocBlock::get()->single() throws
      // CRM_Core_Exception itself if the id doesn't resolve, matching the
      // throw this used to do manually off APIv3's is_error/error_message.
      $loc_block = (array) LocBlock::get(FALSE)
        ->addWhere('id', '=', $bid)
        ->execute()
        ->single();

      $apiClasses = [
        'address' => Address::class,
        'email' => Email::class,
        'phone' => Phone::class,
      ];

      $tmp = array();

      foreach ($loc_block as $field => $value) {
        $tmp = explode("_", $field);
        if(count($tmp) == 3) {
          unset($tmp[2]);
        }
        elseif (count($tmp) == 2) {
          $tmp[1] = 1;
        }
        else {
          continue;
        }

        if (empty($value)) {
          // Unused blocks (e.g. a second email/phone, or IM which this
          // extension doesn't manage) are NULL on the LocBlock - skip them
          // rather than calling get() with an invalid id.
          continue;
        }

        $result = (array) $apiClasses[$tmp[0]]::get(FALSE)
          ->addWhere('id', '=', $value)
          ->execute()
          ->single();

        if($tmp[0] == 'address') {
          if (CRM_Utils_Array::value('name', $result, '') == '') {
            CRM_Utils_System::setTitle(ts('Edit Location', array()));
          } else {
            CRM_Utils_System::setTitle(ts('Edit Location - %1', array(1 => CRM_Utils_Array::value('name', $result, ''))));
          }
        }

        $this->_values[strtolower($tmp[0])][$tmp[1]] = $result;
      }
      $this->set('values', $this->_values);
    }
  }

  /**
   * Delete this location's LocBlock and its Address/Email/Phone records,
   * then redirect back to the Manage Event Locations listing.
   *
   * Does not check whether any Event still references this LocBlock - it
   * didn't before either, when this same deletion was reachable as a
   * SearchKit row action on the Manage Event Locations listing.
   */
  protected function deleteLocation(int $bid): void {
    if (!CRM_Core_Permission::check('edit locations')) {
      throw new CRM_Core_Exception(ts('You do not have permission to delete this location.'));
    }

    $locBlock = (array) LocBlock::get(FALSE)
      ->addWhere('id', '=', $bid)
      ->execute()
      ->single();

    $fieldsByEntity = [
      Address::class => ['address_id'],
      Email::class => ['email_id', 'email_2_id'],
      Phone::class => ['phone_id', 'phone_2_id'],
    ];

    foreach ($fieldsByEntity as $apiClass => $fields) {
      $ids = array_values(array_filter(array_map(fn($field) => $locBlock[$field] ?? NULL, $fields)));
      if ($ids) {
        $apiClass::delete(FALSE)
          ->addWhere('id', 'IN', $ids)
          ->execute();
      }
    }

    LocBlock::delete(FALSE)
      ->addWhere('id', '=', $bid)
      ->execute();

    CRM_Core_Session::setStatus(ts('Location has been deleted.'), ts('Deleted'), 'success');
    CRM_Utils_System::redirect(CRM_Utils_System::url('civicrm/manage-event-locations', 'reset=1'));
  }

  public function setDefaultValues() {
    $defaults = $this->_values;

    $config = CRM_Core_Config::singleton();
    if (!isset($defaults['address'][1]['country_id'])) {
      $defaults['address'][1]['country_id'] = $config->defaultContactCountry;
    }

    if (!isset($defaults['address'][1]['state_province_id'])) {
      $defaults['address'][1]['state_province_id'] = $config->defaultContactStateProvince;
    }

    if (!CRM_Core_Permission::check('edit locations')) {
      //$this->assign('message', 'No permission to edit');
      foreach (array_keys($this->_elements) as $key) {
        $this->_elements[$key]->freeze();
      }
    }
    return $defaults;
  }

  public function buildQuickForm() {
    $this->applyFilter('__ALL__', 'trim');

    //build location blocks.
    //
    //CRM_Contact_Form_Location::buildQuickForm() was deprecated in CiviCRM
    //5.66 and removed in later versions (civicrm/civicrm-core#30813), so the
    //address/email/phone blocks are built directly here instead, matching
    //the pattern CiviCRM core itself uses for its own event location form
    //(CRM_Event_Form_ManageEvent_Location): a fixed 2 instances of email and
    //phone, no location type/on-hold/bulk-mail/is-primary fields (those are
    //contact concepts that don't apply to an event's location) and no
    //dynamic "add another" - EditLocation.tpl renders its own minimal
    //markup for email/phone rather than the full, generic
    //CRM/Contact/Form/Edit/Email|Phone.tpl. Newer CiviCRM versions give the
    //parent class non-deprecated trait methods for this; use them when
    //available and fall back to the older, still-functional-but-deprecated
    //calls on CiviCRM versions that predate them.
    CRM_Contact_Form_Edit_Address::buildQuickForm($this, 1);
    if (method_exists($this, 'addEmailBlockNonContactFields')) {
      $this->addEmailBlockNonContactFields(1);
      $this->addEmailBlockNonContactFields(2);
    }
    else {
      CRM_Contact_Form_Edit_Email::buildQuickForm($this, 1);
      CRM_Contact_Form_Edit_Email::buildQuickForm($this, 2);
    }
    if (method_exists($this, 'addPhoneBlockFields')) {
      $this->addPhoneBlockFields(1);
      $this->addPhoneBlockFields(2);
    }
    else {
      CRM_Contact_Form_Edit_Phone::buildQuickForm($this, 1);
      CRM_Contact_Form_Edit_Phone::buildQuickForm($this, 2);
    }

    //fix for CRM-1971
    $this->assign('action', $this->_action);

    // Disabled permission check as reserved locations are not implemented.
      if (CRM_Core_Permission::check('edit locations')) {
        $buttons = array(
          array(
            'type' => 'upload',
            'name' => ts('Save'),
            'isDefault' => TRUE,
          ),
          array(
            'type' => 'cancel',
            'name' => ts('Cancel'),
          ),
        );

        //$this->assign('message', 'Permission of editting enabled');
        $this->addButtons($buttons);

        // $this->addCheckBox('location_reserved', ts('Is location reserved?'),array());
      }
      else {
        //$this->assign('message', 'Permission of editting disabled');
      }

      $this->assign('loc_srch_url', CRM_Utils_System::url('civicrm/manage-event-locations', NULL, TRUE));
  }

  public function postProcess() {
    $params = $this->exportValues();

    if( !empty($this->_values)) {
      $bid = $_SESSION['loc_edt_bid'];
      $locBlockUpdates = array();

      //iterate over what was actually submitted, not just the blocks that
      //already existed on this location - otherwise adding an email/phone
      //to a location that didn't already have one is silently dropped.
      foreach (array('address', 'email', 'phone') as $blockName) {
        if (empty($params[$blockName]) || !is_array($params[$blockName])) {
          continue;
        }

        $records = array();
        $customFieldsByKey = array();

        foreach ($params[$blockName] as $key => $value) {
          if (!$this->blockInstanceHasData($blockName, $value)) {
            continue;
          }

          $existingId = $this->_values[$blockName][$key]['id'] ?? NULL;
          if ($existingId) {
            $value['id'] = $existingId;
          }
          else {
            unset($value['id']);
          }

          //going to update normal fields and custom fields seperately, so pop out all the custom fields
          $customFieldsByKey[$key] = $this->pop_out_custom_fields($value);
          $records[$key] = $value;
        }

        if (empty($records)) {
          continue;
        }

        //address/email/phone attached to a location block have no
        //contact_id, so APIv3's mandatory contact_id requirement for these
        //entities doesn't work here. Use APIv4 for email/phone (matching
        //CiviCRM core's own event location form); address still needs the
        //BAO layer since APIv4 doesn't support this form's custom_XX field
        //format for address custom data.
        $savedIds = array();
        if ($blockName == 'address') {
          foreach ($records as $key => $record) {
            $savedIds[$key] = CRM_Core_BAO_Address::writeRecord($record)->id;
          }
        }
        else {
          $apiClass = ($blockName == 'email') ? Email::class : Phone::class;
          $saved = $apiClass::save(FALSE)->setRecords(array_values($records))->execute();
          $keys = array_keys($records);
          foreach ($saved as $index => $savedRecord) {
            $savedIds[$keys[$index]] = $savedRecord['id'];
          }
        }

        foreach ($savedIds as $key => $id) {
          //update custom fields on each block, if any
          //
          //Left on APIv3: the field keys here are the generic custom_XX
          //form-submission format for whichever custom fields happen to be
          //on this entity_table, not a specific known custom group - APIv4's
          //CustomValue API addresses a single named custom group at a time,
          //so it doesn't have a matching generic entry point for this.
          if (!empty($customFieldsByKey[$key])) {
            $query_array = array('entity_id' => $id,'entity_table' => "$blockName",) + $customFieldsByKey[$key];
            $result = civicrm_api3('CustomValue', 'create', $query_array);

            if( !empty($result['is_error'])) {
              throw new CRM_Core_Exception($result['error_message']);
            }
          }

          //this block didn't previously exist on the location - link the
          //newly-created record back onto the LocBlock.
          if (empty($this->_values[$blockName][$key]['id'])) {
            $fieldName = ($key == 1) ? "{$blockName}_id" : "{$blockName}_{$key}_id";
            $locBlockUpdates[$fieldName] = $id;
          }
        }
      }

      if (!empty($locBlockUpdates)) {
        LocBlock::update(FALSE)
          ->addWhere('id', '=', $bid)
          ->setValues($locBlockUpdates)
          ->execute();
      }
    }
    else {
      $defaultLocationType = CRM_Core_BAO_LocationType::getDefault();
      foreach (array('address','phone','email',) as $block) {
        if (empty($params[$block]) || !is_array($params[$block])) {
          continue;
        }
        foreach ($params[$block] as $count => & $values) {
          if ($count == 1) {
            $values['is_primary'] = 1;
          }
          $values['location_type_id'] = ($defaultLocationType->id) ? $defaultLocationType->id : 1;
        }
      }

      // create/update new blocks.
      $location = CRM_Core_BAO_Location::create($params, TRUE, NULL);

      $params_array = array();

      foreach ($location as $blockName => $block) {
        if (empty($block) || !is_array($block) || $blockName == 'openid') {
          continue;
        }

        foreach ($block as $index => $values) {
          $index = $index + 1;
          if($index == 1) {
            $name = $blockName . '_id';
          }
          else {
            $name = $blockName.'_'. $index . '_id';
          }
          $params_array[$name] = $values->id;
        }
      }
      $bid = LocBlock::save(FALSE)
        ->setRecords([$params_array])
        ->execute()
        ->first()['id'];
    }

    CRM_Core_Session::setStatus(ts("Location information has been saved."), ts('Saved'), 'success');

    if(!isset($bid) ) {
      $bid = $_SESSION['loc_edt_bid'];
    }

    CRM_Core_Session::singleton()->pushUserContext(CRM_Utils_System::url('civicrm/EditLocation','bid='.$bid));
  }

  /**
   * Is there meaningful data entered for this block instance?
   *
   * Used to decide whether a submitted email/phone/address block should be
   * saved at all, since every instance is always present in $params (the
   * form always builds 2 email and 2 phone blocks) whether or not the user
   * filled it in.
   *
   * @param string $blockName
   * @param array $value
   *
   * @return bool
   */
  protected function blockInstanceHasData($blockName, array $value) {
    if ($blockName == 'email') {
      return !empty($value['email']);
    }
    if ($blockName == 'phone') {
      return !empty($value['phone']);
    }
    foreach ($value as $key => $fieldValue) {
      if ($key == 'id' || $key == 'location_type_id') {
        continue;
      }
      if (!empty($fieldValue)) {
        return TRUE;
      }
    }
    return FALSE;
  }

  protected function pop_out_custom_fields(array &$input = array()) {
    if(empty($input) || gettype($input) != 'array') {
      return false;
    }

    $output = array();
    $tmp = null;

    foreach ($input as $key => $value) {
      if(strrpos($key,"custom_") !== false){

        $tmp = explode('_',$key);

        $tmp = $tmp[0].'_'.$tmp[1];

        $output[$tmp] = $value;

        unset($input[$key]);
      }
      else {
        continue;
      }
    }
    return $output;
  }

  /**
   * Return a descriptive name for the page, used in wizard header
   *
   * @return string
   */
  public function getTitle() {
    return ts('Edit Location');
  }

}
