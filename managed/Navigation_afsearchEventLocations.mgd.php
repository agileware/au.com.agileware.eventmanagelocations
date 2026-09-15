<?php
use CRM_Eventmanagelocations_ExtensionUtil as E;

return [
  [
    'name' => 'Navigation_afsearchEventLocations',
    'entity' => 'Navigation',
    'cleanup' => 'always',
    'update' => 'unmodified',
    'params' => [
      'version' => 4,
      'values' => [
        'label' => E::ts('Search Locations'),
        'name' => 'afsearchEventLocations',
        'url' => 'civicrm/search/locations',
        'icon' => 'crm-i fa-map-marker',
        'permission' => [
          'access CiviCRM',
        ],
        'permission_operator' => 'AND',
        'parent_id.name' => 'Search',
        'is_active' => TRUE,
        'weight' => 20,
      ],
      'match' => [
        'name',
        'domain_id',
      ],
    ],
  ],
];
