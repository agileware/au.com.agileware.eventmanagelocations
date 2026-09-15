<?php
use CRM_Eventmanagelocations_ExtensionUtil as E;

return [
  'type' => 'search',
  'title' => E::ts('Search Locations'),
  'icon' => 'fa-map-marker',
  'server_route' => 'civicrm/search/locations',
  'permission' => [
    'access CiviCRM',
  ],
  'search_displays' => [
    'EventLocations.EventLocations_Table_1',
  ],
];
