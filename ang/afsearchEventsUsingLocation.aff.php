<?php
use CRM_Eventmanagelocations_ExtensionUtil as E;

return [
  'type' => 'search',
  'title' => E::ts('Events Using This Location'),
  'icon' => 'fa-calendar',
  'server_route' => 'civicrm/manage-event-locations/events',
  'permission' => [
    'access CiviEvent',
    'access CiviCRM',
  ],
  'permission_operator' => 'AND',
  'search_displays' => [
    'EventsUsingLocation.EventsUsingLocation_Table_1',
  ],
];
