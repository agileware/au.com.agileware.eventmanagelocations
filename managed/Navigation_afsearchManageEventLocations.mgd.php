<?php
use CRM_Eventmanagelocations_ExtensionUtil as E;

return [
  [
    'name' => 'Navigation_afsearchManageEventLocations',
    'entity' => 'Navigation',
    'cleanup' => 'unused',
    'update' => 'unmodified',
    'params' => [
      'version' => 4,
      'values' => [
        'label' => E::ts('Manage Event Locations'),
        'name' => 'afsearchManageEventLocations',
        'url' => 'civicrm/manage-event-locations',
        'icon' => 'crm-i fa-list-alt',
        'permission' => [
          'access CiviEvent',
          'access CiviCRM',
        ],
        'permission_operator' => 'AND',
        'parent_id.name' => 'Events',
        'weight' => 12,
      ],
      'match' => ['name', 'domain_id'],
    ],
  ],
];
