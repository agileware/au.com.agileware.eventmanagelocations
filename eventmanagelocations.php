<?php

require_once 'eventmanagelocations.civix.php';

/**
 * Implements hook_civicrm_config().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_config
 */
function eventmanagelocations_civicrm_config(&$config) {
  _eventmanagelocations_civix_civicrm_config($config);
}

/**
 * Implements hook_civicrm_install().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_install
 */
function eventmanagelocations_civicrm_install() {
  _eventmanagelocations_civix_civicrm_install();
}

/**
 * Implements hook_civicrm_enable().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_enable
 */
function eventmanagelocations_civicrm_enable() {
  _eventmanagelocations_civix_civicrm_enable();
}

/**
 * Functions below this ship commented out. Uncomment as required.
 *

/**
 * Implements hook_civicrm_preProcess().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_preProcess
 *

 // */

/**
 * Implements hook_civicrm_navigationMenu().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_navigationMenu
 *
function eventmanagelocations_civicrm_navigationMenu(&$menu) {
  _eventmanagelocations_civix_insert_navigation_menu($menu, NULL, array(
    'label' => ts('The Page', array('domain' => 'au.com.agileware.eventmanagelocations')),
    'name' => 'the_page',
    'url' => 'civicrm/the-page',
    'permission' => 'access CiviReport,access CiviContribute',
    'operator' => 'OR',
    'separator' => 0,
  ));
  _eventmanagelocations_civix_navigationMenu($menu);
} // */
/*
*/

/**
 * Implements hook_civicrm_permission().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_permission
 */
function eventmanagelocations_civicrm_permission(&$permissions) {
  $permissions['edit locations'] = ts('Locations: Edit locations');
}

/**
 * Implements hook_civicrm_buildForm().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_buildForm
 *
 * Force the location option to always be "Create new location"
 */
function eventmanagelocations_civicrm_buildForm($formName, &$form) {
  if ($formName == 'CRM_Event_Form_ManageEvent_Location') {
    // Remove the "Copy From Event" selector if it exists
    if ($form->elementExists('loc_event_id')) {
      $form->removeElement('loc_event_id');
    }
    // Remove the legacy radio buttons if they exist
    if ($form->elementExists('location_option')) {
      $form->removeElement('location_option');
    }

    // Copy data from the old location
    $defaults = [];
    $entities = ['email', 'phone', 'address'];

    foreach ($entities as $entity) {
        $sourceData = [];

        // Try _values first
        if (!empty($form->_values[$entity]) && is_array($form->_values[$entity])) {
            $sourceData = $form->_values[$entity];
        } 
        // Fallback to _defaultValues
        elseif (!empty($form->_defaultValues[$entity]) && is_array($form->_defaultValues[$entity])) {
            $sourceData = $form->_defaultValues[$entity];
        }

        if (!empty($sourceData)) {
            $cleanData = [];
            foreach ($sourceData as $key => $data) {
                // Ensure we have an array before accessing keys
                if (is_array($data)) {
                    // CRITICAL: Unset the ID. This turns "Update Email #35" into "Create New Email"
                    if (isset($data['id'])) {
                        unset($data['id']); 
                    }
                    // Also unset loc_block_id inside the entities if present
                    if (isset($data['loc_block_id'])) {
                        unset($data['loc_block_id']);
                    }
                    $cleanData[$key] = $data;
                }
            }
            if (!empty($cleanData)) {
                $defaults[$entity] = $cleanData;
            }
        }
    }

    // Force a new location to be saved

    // Unset the loc_block_id from _values.
    // This tells CiviCRM: "I am not attached to any existing location block."
    if (isset($form->_values['loc_block_id'])) {
        unset($form->_values['loc_block_id']);
    }

    if (isset($form->locationBlock)) {
        $form->locationBlock = NULL;
    }

    // Remove the hidden field that stores the ID (if it exists)
    // This prevents the ID from being POSTed back to the server.
    if ($form->elementExists('loc_block_id')) {
        $form->removeElement('loc_block_id');
    }

    // Apply Defaults
    if (!empty($defaults)) {
        $form->setDefaults($defaults);
    }

    // Hide the location selector wrapper
    $form->assign('locUsed', 0);
    $form->assign('locEvents', FALSE);
  }
}
