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
 * Implements hook_civicrm_uninstall().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_uninstall
 */
function eventmanagelocations_civicrm_uninstall() {
  _eventmanagelocations_civix_civicrm_uninstall();
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
 * Implements hook_civicrm_disable().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_disable
 */
function eventmanagelocations_civicrm_disable() {
  _eventmanagelocations_civix_civicrm_disable();
}

/**
 * Implements hook_civicrm_upgrade().
 *
 * @param $op string, the type of operation being performed; 'check' or 'enqueue'
 * @param $queue CRM_Queue_Queue, (for 'enqueue') the modifiable list of pending up upgrade tasks
 *
 * @return mixed
 *   Based on op. for 'check', returns array(boolean) (TRUE if upgrades are pending)
 *                for 'enqueue', returns void
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_upgrade
 */
function eventmanagelocations_civicrm_upgrade($op, CRM_Queue_Queue $queue = NULL) {
  return _eventmanagelocations_civix_civicrm_upgrade($op, $queue);
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
    $defaults = array();
    if ($form->elementExists('location_option')) {
      // Reset the location option to create a new LocBlock every time.
      $form->removeElement('location_option');
    }

    $form->addElement('hidden', 'location_option');
    $form->getElement('location_option')->setValue(1);
    $defaults['location_option'] = 1;

    if($form->elementExists('loc_event_id')) {
      // Remove the location selector.
      $form->removeElement('loc_event_id');
    }

    // Phones and Emails are passed through to the Loc Block create function
    // with their original ids unless we unset them here. If the id is passed through
    // the Loc block create function uses that instead of the newly created id so a db constraint happens
    foreach (['email', 'phone'] as $entity) {
        if (!empty($form->_values[$entity])) {
            foreach ($form->_values[$entity] as $key => $data) {
                    unset($form->_values[$entity][$key]['id']);
            }
            $defaults['email'] = $form->_values['email'];
        }
    }

    // Ensure locUsed is 0, otherwise we get confusing output.
    $form->assign('locUsed', 0);

    // Actually, remove the entire block.
    $form->assign('locEvents', FALSE);

    // Overwrite the applicable (location_option) default values.
    if(!empty($default)) {
      $form->setDefaults($defaults);
    }
  }
}

/**
 * Implements hook_civicrm_postInstall().
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_postInstall
 */
function eventmanagelocations_civicrm_postInstall() {
  _eventmanagelocations_civix_civicrm_postInstall();
}

/**
 * Implements hook_civicrm_entityTypes().
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_entityTypes
 */
function eventmanagelocations_civicrm_entityTypes(&$entityTypes) {
  _eventmanagelocations_civix_civicrm_entityTypes($entityTypes);
}
