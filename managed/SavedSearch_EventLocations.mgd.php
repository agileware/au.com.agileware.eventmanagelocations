<?php
use CRM_Eventmanagelocations_ExtensionUtil as E;

return [
  [
    'name' => 'SavedSearch_EventLocations',
    'entity' => 'SavedSearch',
    'cleanup' => 'unused',
    'update' => 'unmodified',
    'params' => [
      'version' => 4,
      'values' => [
        'name' => 'EventLocations',
        'label' => E::ts('Search Locations'),
        'api_entity' => 'LocBlock',
        'api_params' => [
          'version' => 4,
          'select' => [
            'id',
            'address_id.name',
            'address_id.street_address',
            'address_id.city',
            'address_id.country_id:label',
            'address_id.state_province_id:label',
          ],
          'orderBy' => [],
          'where' => [],
          'groupBy' => [],
          'join' => [],
          'having' => [],
        ],
      ],
      'match' => [
        'name',
      ],
    ],
  ],
  [
    'name' => 'SavedSearch_EventLocations_SearchDisplay_EventLocations_Table_1',
    'entity' => 'SearchDisplay',
    'cleanup' => 'unused',
    'update' => 'unmodified',
    'params' => [
      'version' => 4,
      'values' => [
        'name' => 'EventLocations_Table_1',
        'label' => E::ts('Search Locations'),
        'saved_search_id.name' => 'EventLocations',
        'type' => 'table',
        'settings' => [
          'description' => NULL,
          'sort' => [
            ['address_id.name', 'ASC'],
          ],
          'limit' => 50,
          'pager' => [],
          'placeholder' => 5,
          'columns' => [
            [
              'type' => 'field',
              'key' => 'address_id.name',
              'dataType' => 'String',
              'label' => E::ts('Address Name'),
              'sortable' => TRUE,
            ],
            [
              'type' => 'field',
              'key' => 'address_id.street_address',
              'dataType' => 'String',
              'label' => E::ts('Street Address'),
              'sortable' => TRUE,
            ],
            [
              'type' => 'field',
              'key' => 'address_id.city',
              'dataType' => 'String',
              'label' => E::ts('City'),
              'sortable' => TRUE,
            ],
            [
              'type' => 'field',
              'key' => 'address_id.country_id:label',
              'dataType' => 'String',
              'label' => E::ts('Country'),
              'sortable' => TRUE,
            ],
            [
              'type' => 'field',
              'key' => 'address_id.state_province_id:label',
              'dataType' => 'String',
              'label' => E::ts('State/Province'),
              'sortable' => TRUE,
            ],
            [
              'text' => '',
              'style' => 'default',
              'size' => 'btn-xs',
              'icon' => 'fa-pencil',
              'links' => [
                [
                  'path' => 'civicrm/EditLocation?bid=[id]',
                  'entity' => '',
                  'action' => '',
                  'join' => '',
                  'target' => '',
                  'icon' => 'fa-pencil',
                  'text' => E::ts('Edit Location'),
                  'style' => 'default',
                  'task' => '',
                  'conditions' => [],
                ],
              ],
              'type' => 'links',
              'alignment' => 'text-right',
            ],
          ],
          'actions' => FALSE,
          'classes' => [
            'table',
            'table-striped',
          ],
          'toolbar' => [
            [
              'path' => 'civicrm/EditLocation',
              'entity' => '',
              'action' => '',
              'join' => '',
              'target' => '',
              'text' => E::ts('Create a New Location'),
              'icon' => 'fa-plus',
              'style' => 'primary',
              'task' => '',
              'conditions' => [],
            ],
          ],
        ],
      ],
      'match' => [
        'saved_search_id',
        'name',
      ],
    ],
  ],
];
