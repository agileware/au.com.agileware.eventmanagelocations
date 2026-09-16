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
  $permissions['edit locations'] = [
    'label' => ts('Locations: Edit locations'),
    'description' => ts('Edit event locations'),
  ];
}

/**
 * Implements hook_civicrm_buildForm().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_buildForm
 *
 * Everyone can pick "Use existing location" from the full list of known
 * locations (not just ones already attached to some other event); its
 * address/email/phone fields are always read-only. Only users with the
 * "edit locations" permission additionally get "Create new location", with
 * editable fields.
 */
function eventmanagelocations_civicrm_buildForm($formName, &$form) {
  if ($formName == 'CRM_Event_Form_ManageEvent_Location') {
    $canEditLocations = CRM_Core_Permission::check('edit locations');
    $oldLocBlockId = method_exists($form, 'getLocationBlockID') ? $form->getLocationBlockID() : NULL;
    $allLocations = CRM_Eventmanagelocations_BAO_LocBlock::getAllLocations();

    // Snapshot the event's current location before core's own postProcess()
    // (which fires later in this same request, once buildForm/validate are
    // done) runs: whenever the user moves this event off of it - to "create
    // new" or to a *different* existing location - core's postProcess()
    // deletes it outright if nothing else was using it, on the assumption
    // that a LocBlock exclusively used by one event is that event's private,
    // disposable data. That assumption no longer holds now that "Use
    // existing location" treats every location as a shared, persistent pool
    // (rather than only ones some event already happens to be using) - a
    // location a user deliberately picked earlier shouldn't vanish from that
    // pool just because this event later moved elsewhere. Restored, if
    // needed, in postProcess below.
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST' && $oldLocBlockId) {
      $GLOBALS['_eventmanagelocations_oldLocBlockSnapshot'] = [
        'id' => $oldLocBlockId,
        'data' => _eventmanagelocations_snapshot_locblock((int) $oldLocBlockId),
      ];
    }

    // core's setDefaultValues() assigns this to warn that editing a shared
    // location's fields will also change it for other events - no longer
    // relevant now that those fields are never editable from this tab.
    $form->assign('locUsed', 0);

    if ($form->elementExists('location_option')) {
      $form->removeElement('location_option');
    }
    if ($form->elementExists('loc_event_id')) {
      $form->removeElement('loc_event_id');
    }

    $defaults = [];

    if ($canEditLocations) {
      $form->addRadio('location_option', ts('Choose Location'), [
        '1' => ts('Create new location'),
        '2' => ts('Use existing location'),
      ]);
    }
    else {
      // Only one choice is available - force it via a hidden field (the
      // radio's submitted value is what postProcess() keys its logic off).
      $form->addElement('hidden', 'location_option');
      $form->getElement('location_option')->setValue(2);
    }

    if ($oldLocBlockId && !isset($allLocations[$oldLocBlockId])) {
      // The event's current location has no address on file for some
      // reason - keep it selectable so saving the form doesn't lose it.
      $allLocations[$oldLocBlockId] = ts('(Location %1)', [1 => $oldLocBlockId]);
    }
    if (!$oldLocBlockId || !isset($allLocations[$oldLocBlockId])) {
      $allLocations = ['' => ts('- select -')] + $allLocations;
    }
    $form->add('select', 'loc_event_id', ts('Use Location'), $allLocations, FALSE, ['class' => 'crm-select2']);

    $form->assign('locEvents', TRUE);

    // Resolve the effective choice: whatever was actually submitted (e.g. a
    // failed-validation re-render) takes priority over the computed default,
    // which itself is core's own logic (existing location => 2, none => 1)
    // except non-privileged users never get to "create new". A privileged
    // user switching the radio away from "use existing" also needs a way in:
    // once address/email/phone are frozen server-side (below) there's no
    // live input left for the browser to unfreeze on its own, so
    // location-picker.js reloads the page with _locOpt set instead of trying
    // to toggle in place.
    // This wizard tab replays cached form state into _submitValues even on
    // a bare GET (the same reason getAddressDefaults()'s loc_event_id lookup
    // needs its own !empty() guard above) - so location_option/loc_event_id
    // can look "submitted" on a plain reload too. Only trust it as a real
    // submission on an actual POST, otherwise our own _locOpt reload above
    // would never win against that replayed state.
    $isPost = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
    $submittedOption = $isPost ? ($form->_submitValues['location_option'] ?? NULL) : NULL;
    $requestedOption = $canEditLocations ? CRM_Utils_Request::retrieve('_locOpt', 'Positive') : NULL;
    // The tab's own JS immediately re-fetches this same tab's content via a
    // second, AJAX request built from the tab's plain link (without
    // _locOpt), so relying on the query string alone gets silently
    // overwritten a moment after the first, correct render. Bridge the two
    // requests with a short session flag instead, keyed to this event.
    $sessionKey = 'eventmanagelocations_option_' . ($form->getEventID() ?: 0);
    if ($requestedOption) {
      $_SESSION[$sessionKey] = $requestedOption;
    }
    $sessionOption = $canEditLocations ? ($_SESSION[$sessionKey] ?? NULL) : NULL;
    if ($submittedOption) {
      $resolvedOption = $submittedOption;
    }
    elseif ($requestedOption) {
      $resolvedOption = $requestedOption;
    }
    elseif ($sessionOption) {
      $resolvedOption = $sessionOption;
    }
    elseif (!$canEditLocations) {
      $resolvedOption = 2;
    }
    else {
      $resolvedOption = $oldLocBlockId ? 2 : 1;
    }
    $defaults['location_option'] = $resolvedOption;
    // This wizard tab's controller treats the form as already "submitted"
    // even on a bare GET (see above), and once that's true QuickForm's own
    // element rendering reads _submitValues directly rather than the
    // defaults set via setDefaults() below - so the radio's checked state
    // and the freeze decision just after it need this written directly too.
    $form->_submitValues['location_option'] = $resolvedOption;

    // CRM_Event_Form_ManageEvent_Location::preProcess() tries to load the
    // current address into $this->_values['address'], but that lookup
    // doesn't work for a LocBlock-owned address (see getAddressDefaults()),
    // so it always comes back empty - meaning the address fields would
    // otherwise render blank even though a real location is selected and its
    // email/phone display correctly. Load it directly for whichever LocBlock
    // is actually in effect.
    //
    // This also *replaces* core's own client-side "populate fields when
    // loc_event_id changes" AJAX (civicrm/ajax/locBlock) for our read-only
    // fields, rather than merely supplementing it: that endpoint only knows
    // a LocBlock via an Event already using it (so it can't populate a
    // location that was pre-created but never yet attached anywhere), never
    // returns the underlying Address/Email/Phone record IDs, and - worse -
    // leaves a frozen state_province_id's value stale against a freshly
    // updated country_id (its state-list-reload handshake only works for a
    // live, editable <select>), which fails form validation outright on
    // save. So instead of applying on top of that AJAX, a switch to a
    // different existing location reloads the page (see location-picker.js)
    // and is handled here, from a clean server-rendered state, for
    // everyone - not just users who can create new locations.
    if ($resolvedOption == 2) {
      $isPost = ($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST';
      $submittedLocId = $isPost ? ($form->_submitValues['loc_event_id'] ?? NULL) : NULL;
      $requestedLocId = CRM_Utils_Request::retrieve('_locId', 'Positive');
      $locIdSessionKey = 'eventmanagelocations_locid_' . ($form->getEventID() ?: 0);
      if ($requestedLocId) {
        $_SESSION[$locIdSessionKey] = $requestedLocId;
      }
      $sessionLocId = $_SESSION[$locIdSessionKey] ?? NULL;

      if ($submittedLocId) {
        $effectiveLocBlockId = $submittedLocId;
      }
      elseif ($requestedLocId) {
        $effectiveLocBlockId = $requestedLocId;
      }
      elseif ($sessionLocId) {
        $effectiveLocBlockId = $sessionLocId;
      }
      else {
        $effectiveLocBlockId = $oldLocBlockId;
      }

      if ($effectiveLocBlockId) {
        $defaults['loc_event_id'] = $effectiveLocBlockId;
        $addressDefaults = CRM_Eventmanagelocations_BAO_LocBlock::getAddressDefaults((int) $effectiveLocBlockId);
        if (!empty($addressDefaults)) {
          $defaults['address'][1] = $addressDefaults;
        }
      }
    }

    // Re-apply defaults (merging in any override above) now that
    // location_option/loc_event_id have been rebuilt - core's own
    // setDefaultValues() already ran and computed values for them before
    // this hook fired, but a freshly (re)added element doesn't automatically
    // inherit that; setDefaults() re-pushes the merged defaults onto every
    // currently-registered element, including these.
    $form->setDefaults($defaults);

    // Address/email/phone are always read-only once "use existing location"
    // is in effect - for everyone, regardless of permission.
    if ($resolvedOption == 2) {
      foreach (array_keys($form->_elementIndex) as $name) {
        if (preg_match('/^(address|email|phone)\[/', $name)) {
          $form->getElement($name)->freeze();
        }
      }
    }
    elseif ($resolvedOption == 1 && $oldLocBlockId) {
      // Core's own setDefaultValues() populates these from the event's
      // *current* location whenever one is already attached (regardless of
      // location_option), including a hidden id for each address/email/phone
      // record - so switching to "Create new location" would otherwise
      // silently reuse those ids on save, turning "create new" into an
      // in-place edit of the location just switched away from (which may be
      // shared with other events). setValue() directly on each element
      // (rather than via setDefaults()/$defaults, which deep-merges and so
      // can't clear a key it doesn't mention) guarantees every field,
      // including the id, actually goes blank.
      foreach (array_keys($form->_elementIndex) as $name) {
        if (preg_match('/^(address|email|phone)\[/', $name)) {
          $form->getElement($name)->setValue('');
        }
      }
      // Match core's own blank-form defaults (CRM_Event_Form_ManageEvent_Location::setDefaultValues())
      // for an event with no prior location, rather than leaving the
      // country/state pickers on '- select -'.
      $config = CRM_Core_Config::singleton();
      if ($form->elementExists('address[1][country_id]') && $config->defaultContactCountry) {
        $form->getElement('address[1][country_id]')->setValue($config->defaultContactCountry);
      }
      if ($form->elementExists('address[1][state_province_id]') && $config->defaultContactStateProvince) {
        $form->getElement('address[1][state_province_id]')->setValue($config->defaultContactStateProvince);
      }
    }

    // Loaded for everyone: the loc_event_id-change reload (see above) applies
    // regardless of permission. canEditLocations only gates the Edit
    // Location link and the "Create new location" reload within the script.
    $jsVars = 'var eventmanagelocationsFrozen = ' . ($resolvedOption == 2 ? 'true' : 'false') . ';'
      . 'var eventmanagelocationsCanEdit = ' . ($canEditLocations ? 'true' : 'false') . ';'
      . 'var eventmanagelocationsCurrentLocId = ' . (int) ($effectiveLocBlockId ?? 0) . ';';
    // addScriptFile() depends on the extension container resolving a
    // resource URL for this extension, which some site configurations
    // don't provide; read the file directly instead so this doesn't
    // silently fail to load.
    CRM_Core_Resources::singleton()->addScript($jsVars . "\n" . file_get_contents(__DIR__ . '/js/location-picker.js'));
  }
}

/**
 * Implements hook_civicrm_postProcess().
 *
 * @link http://wiki.civicrm.org/confluence/display/CRMDOC/hook_civicrm_postProcess
 *
 * Fires after core's own postProcess() has already saved everything, so
 * nothing here can prevent what core did - only correct it afterwards.
 */
function eventmanagelocations_civicrm_postProcess($formName, &$form) {
  if ($formName == 'CRM_Event_Form_ManageEvent_Location') {
    $eventId = method_exists($form, 'getEventID') ? $form->getEventID() : NULL;
    unset($_SESSION['eventmanagelocations_option_' . ($eventId ?: 0)]);
    unset($_SESSION['eventmanagelocations_locid_' . ($eventId ?: 0)]);

    if ($eventId) {
      _eventmanagelocations_fix_reused_location($form, $eventId);
    }

    $snapshot = $GLOBALS['_eventmanagelocations_oldLocBlockSnapshot'] ?? NULL;
    unset($GLOBALS['_eventmanagelocations_oldLocBlockSnapshot']);
    if ($snapshot) {
      _eventmanagelocations_restore_locblock_if_deleted($snapshot['id'], $snapshot['data']);
    }
  }
}

/**
 * Correct a LocBlock mix-up that CRM_Event_Form_ManageEvent_Location's own
 * postProcess() makes when "Use existing location" is switched from one
 * already-attached location to a *different* one.
 *
 * Core's postProcess() only re-resolves a selected LocBlock's real
 * Address/Email/Phone IDs when the event previously had *no* location at
 * all (via a fresh LocBlock::get() lookup); when swapping between two
 * already-attached locations it instead trusts the submitted field values
 * as if they were for a brand new location, so it creates a brand new
 * LocBlock/Address/Email/Phone set (blank, since our read-only fields for
 * the previous selection were never live inputs to begin with) and points
 * the event at that instead of the location actually selected - silently
 * losing the event's location data. The no-op-resave and
 * previously-no-location cases aren't affected; core already handles those
 * correctly.
 *
 * @param CRM_Core_Form $form
 * @param int $eventId
 */
function _eventmanagelocations_fix_reused_location($form, $eventId) {
  $submitted = $form->_submitValues ?? [];
  if (($submitted['location_option'] ?? NULL) != 2) {
    return;
  }

  $intendedLocBlockId = (int) ($submitted['loc_event_id'] ?? 0);
  if (!$intendedLocBlockId) {
    return;
  }

  $savedLocBlockId = (int) CRM_Core_DAO::getFieldValue('CRM_Event_DAO_Event', $eventId, 'loc_block_id');
  if (!$savedLocBlockId || $savedLocBlockId === $intendedLocBlockId) {
    // Nothing to fix: either there's no location on the event at all, or
    // core already correctly attached the one that was actually selected.
    return;
  }

  $stillExists = \Civi\Api4\LocBlock::get(FALSE)
    ->addWhere('id', '=', $intendedLocBlockId)
    ->selectRowCount()
    ->execute()
    ->count();
  if (!$stillExists) {
    // The location picked no longer exists - leave whatever core did.
    return;
  }

  CRM_Core_DAO::setFieldValue('CRM_Event_DAO_Event', $eventId, 'loc_block_id', $intendedLocBlockId);
  // Only deletes it if nothing else has started using it since.
  CRM_Event_BAO_Event::deleteEventLocBlock($savedLocBlockId, $eventId);

  // Core's own postProcess() always stamps a valid location_type_id onto
  // every Address/Email/Phone it actually writes - so a location normally
  // self-heals the moment it's saved through this form. The one path that
  // bypasses that write (this correction, since it repoints to $intendedLocBlockId
  // without going through core's save logic) can leave a pre-existing gap
  // in place instead: a NULL location_type_id here isn't just cosmetic -
  // CiviCRM's own public Event Info page (CRM_Core_BAO_Address/Email/Phone's
  // allEntity*() lookups) inner-joins on location_type_id, so a NULL there
  // makes the location silently vanish from an event's public page (with
  // PHP warnings) rather than merely losing a label.
  _eventmanagelocations_repair_location_types($intendedLocBlockId);
}

/**
 * Which APIv4 entity class owns each of a LocBlock's foreign-key fields.
 *
 * @return array
 */
function _eventmanagelocations_locblock_entity_fields(): array {
  return [
    'address_id' => \Civi\Api4\Address::class,
    'address_2_id' => \Civi\Api4\Address::class,
    'email_id' => \Civi\Api4\Email::class,
    'email_2_id' => \Civi\Api4\Email::class,
    'phone_id' => \Civi\Api4\Phone::class,
    'phone_2_id' => \Civi\Api4\Phone::class,
  ];
}

/**
 * Backfill a default location_type_id onto any of a LocBlock's
 * Address/Email/Phone records that are missing one.
 *
 * @param int $locBlockId
 */
function _eventmanagelocations_repair_location_types(int $locBlockId) {
  $locBlock = \Civi\Api4\LocBlock::get(FALSE)
    ->addWhere('id', '=', $locBlockId)
    ->execute()
    ->first();
  if (empty($locBlock)) {
    return;
  }

  $defaultLocationTypeId = CRM_Core_BAO_LocationType::getDefault()->id ?? 1;
  foreach (_eventmanagelocations_locblock_entity_fields() as $field => $apiClass) {
    $entityId = $locBlock[$field] ?? NULL;
    if (!$entityId) {
      continue;
    }
    $apiClass::update(FALSE)
      ->addWhere('id', '=', $entityId)
      ->addWhere('location_type_id', 'IS NULL')
      ->addValue('location_type_id', $defaultLocationTypeId)
      ->execute();
  }
}

/**
 * Capture a LocBlock's Address/Email/Phone data so it can be recreated if
 * CRM_Event_Form_ManageEvent_Location::postProcess() ends up deleting it
 * later in this same request (see eventmanagelocations_civicrm_buildForm()).
 *
 * @param int $locBlockId
 *
 * @return array|null
 *   Field name => record (each without its own 'id'), or NULL if the
 *   LocBlock doesn't exist.
 */
function _eventmanagelocations_snapshot_locblock(int $locBlockId): ?array {
  $locBlock = \Civi\Api4\LocBlock::get(FALSE)
    ->addWhere('id', '=', $locBlockId)
    ->execute()
    ->first();
  if (empty($locBlock)) {
    return NULL;
  }

  $snapshot = [];
  foreach (_eventmanagelocations_locblock_entity_fields() as $field => $apiClass) {
    $entityId = $locBlock[$field] ?? NULL;
    if (!$entityId) {
      continue;
    }
    $record = $apiClass::get(FALSE)
      ->addWhere('id', '=', $entityId)
      ->execute()
      ->first();
    if (!empty($record)) {
      unset($record['id']);
      $snapshot[$field] = $record;
    }
  }

  return $snapshot ?: NULL;
}

/**
 * Recreate a LocBlock from a snapshot taken earlier in the same request, if
 * (and only if) it's since been deleted - restoring it as a fresh LocBlock
 * (a new id; the original's is gone for good) with the same
 * Address/Email/Phone content, so it remains part of the pool of locations
 * "Use existing location" and "Manage Event Locations" offer.
 *
 * @param int $locBlockId
 *   The LocBlock id the snapshot was taken from.
 * @param array|null $snapshot
 *   As returned by _eventmanagelocations_snapshot_locblock().
 */
function _eventmanagelocations_restore_locblock_if_deleted(int $locBlockId, ?array $snapshot) {
  if (empty($snapshot)) {
    return;
  }

  $stillExists = \Civi\Api4\LocBlock::get(FALSE)
    ->addWhere('id', '=', $locBlockId)
    ->selectRowCount()
    ->execute()
    ->count();
  if ($stillExists) {
    return;
  }

  $record = [];
  foreach (_eventmanagelocations_locblock_entity_fields() as $field => $apiClass) {
    if (empty($snapshot[$field])) {
      continue;
    }
    $saved = $apiClass::save(FALSE)->setRecords([$snapshot[$field]])->execute()->first();
    $record[$field] = $saved['id'];
  }

  if (!empty($record)) {
    \Civi\Api4\LocBlock::save(FALSE)->setRecords([$record])->execute();
  }
}
