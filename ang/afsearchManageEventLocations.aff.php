<?php
use CRM_Eventmanagelocations_ExtensionUtil as E;

return [
  'type' => 'search',
  'title' => E::ts('Manage Event Locations'),
  'icon' => 'fa-list-alt',
  'server_route' => 'civicrm/manage-event-locations',
  'permission' => [
    'access CiviEvent',
    'access CiviCRM',
  ],
];
