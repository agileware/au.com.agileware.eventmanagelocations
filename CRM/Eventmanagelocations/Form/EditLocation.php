<?php

require_once 'CRM/Core/Form.php';

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
    //address/email/phone blocks are built directly here instead. Newer
    //CiviCRM versions give the parent class non-deprecated trait methods for
    //email/phone; use those when available and fall back to the older,
    //still-functional-but-deprecated calls on CiviCRM versions that predate
    //them.
    //
    //CRM/Contact/Form/Edit/Address|Email|Phone.tpl all key off a $blockId
    //(and $addBlock) smarty variable to know which block instance they are
    //rendering, which CRM_Contact_Form_Location::buildQuickForm() used to
    //assign for us. Assign it ourselves now that we call the block builders
    //directly - this extension's EditLocation.tpl only ever includes each
    //template once, so a single blockId of 1 covers all three.
    $this->assign('addBlock', FALSE);
    $this->assign('blockId', 1);

    //CRM/Contact/Form/Edit/Email.tpl (this extension's EditLocation.tpl
    //includes the full, generic template, not core's trimmed-down
    //event-location-specific one) also renders location_type_id, on_hold,
    //is_bulkmail and is_primary, so the "contact fields" must be built too -
    //not just addEmailBlockNonContactFields().
    CRM_Contact_Form_Edit_Address::buildQuickForm($this, 1);
    if (method_exists($this, 'addEmailBlockFields')) {
      $this->addEmailBlockFields(1);
      $this->addEmailBlockFields(2);
    }
    else {
      CRM_Contact_Form_Edit_Email::buildQuickForm($this, 1, TRUE);
      CRM_Contact_Form_Edit_Email::buildQuickForm($this, 2, TRUE);
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
      $custom_fields_array = array();
      foreach ($this->_values as $blockName => $block_value) {
        foreach ($block_value as $key => $value) {
            $custom_fields_array = array();
            $id = $value['id'];

            $params[$blockName][$key]['id'] =  $id;

            //going to update normal fields and custom fields seperately, so pop out all the custom fields
            $custom_fields_array = $this->pop_out_custom_fields($params[$blockName][$key]);

            //update normal fields on each block
            $result = civicrm_api3($blockName, 'create', $params[$blockName][$key] + array('contact_id'=>'','location_type_id'=>''));

            if( !empty($result['is_error'])) {
              throw new CRM_Core_Exception($result['error_message']);
            }

            //update custom fields on each block, if any
            if(!empty($custom_fields_array)) {
              $query_array = array('entity_id' => $id,'entity_table' => "$blockName",) + $custom_fields_array;
              $result = civicrm_api3('CustomValue', 'create', $query_array);

              if( !empty($result['is_error'])) {
                throw new CRM_Core_Exception($result['error_message']);
              }
            }
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
