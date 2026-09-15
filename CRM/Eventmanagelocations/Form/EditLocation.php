<?php

require_once 'CRM/Core/Form.php';

use Civi\Api4\Email;
use Civi\Api4\Phone;

/**
 * Form controller class
 *
 * @see http://wiki.civicrm.org/confluence/display/CRMDOC43/QuickForm+Reference
 */
class CRM_Eventmanagelocations_Form_EditLocation extends CRM_Event_Form_ManageEvent_Location {
  public function preProcess() {
    parent::preProcess();

    if($bid = CRM_Utils_Request::retrieve('bid', 'Int')) {
      $_SESSION['loc_edt_bid'] = $bid;

      $this->assign('loc_edit_title',ts('Edit Location'));
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

      $loc_block = civicrm_api3('LocBlock', 'getsingle', array('id' => $bid,));

      if(!empty($loc_block['is_error'])) {
        throw new CRM_Core_Exception($loc_block['error_message']);
      }
      else {
        unset($loc_block['is_error']);
      }

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
          // rather than calling getsingle with an invalid id.
          continue;
        }

        $result = civicrm_api3($tmp[0], 'getsingle', array('id' => $value,));

        if($tmp[0] == 'address') {
          if (CRM_Utils_Array::value('name', $result, '') == '') {
            CRM_Utils_System::setTitle(ts('Edit Location', array()));
          } else {
            CRM_Utils_System::setTitle(ts('Edit Location - %1', array(1 => CRM_Utils_Array::value('name', $result, ''))));
          }
        }

        if( empty($result['is_error'])) {
          unset($result['is_error']);
        }
        else {
          throw new CRM_Core_Exception($result['error_message']);
        }
        $this->_values[strtolower($tmp[0])][$tmp[1]] = $result;
      }
      $this->set('values', $this->_values);
    }
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
        $result = civicrm_api3('LocBlock', 'create', array('id' => $bid) + $locBlockUpdates);

        if( !empty($result['is_error'])) {
          throw new CRM_Core_Exception($result['error_message']);
        }
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
      $params_array["sequential"] = 1;
      $result = civicrm_api3('LocBlock', 'create', $params_array);
      $bid = $result['values'][0]['id'];
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
