<?php
use CRM_Eventmanagelocations_ExtensionUtil as E;

return [
  [
    'name' => 'SavedSearch_ManageEventLocations',
    'entity' => 'SavedSearch',
    'cleanup' => 'unused',
    'update' => 'unmodified',
    'params' => [
      'version' => 4,
      'values' => [
        'name' => 'ManageEventLocations',
        'label' => E::ts('Manage Event Locations'),
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
            'COUNT(LocBlock_Event_loc_block_id_01.id) AS COUNT_LocBlock_Event_loc_block_id_01_id',
          ],
          'orderBy' => [],
          'where' => [
            ['address_id', 'IS NOT NULL'],
          ],
          'groupBy' => [
            'id',
          ],
          'join' => [
            [
              'Event AS LocBlock_Event_loc_block_id_01',
              'LEFT',
              [
                'id',
                '=',
                'LocBlock_Event_loc_block_id_01.loc_block_id',
              ],
            ],
          ],
          'having' => [],
        ],
        'description' => E::ts('Shows every location with an address - the same full pool an event\'s "Use existing location" picker offers, whether or not any event is currently using it.'),
      ],
      'match' => [
        'name',
      ],
    ],
  ],
  [
    'name' => 'SavedSearch_ManageEventLocations_SearchDisplay_ManageEventLocations_Table_1',
    'entity' => 'SearchDisplay',
    'cleanup' => 'unused',
    'update' => 'unmodified',
    'params' => [
      'version' => 4,
      'values' => [
        'name' => 'ManageEventLocations_Table_1',
        'label' => E::ts('Manage Event Locations'),
        'saved_search_id.name' => 'ManageEventLocations',
        'type' => 'table',
        'settings' => [
          'description' => E::ts('Editing an address here updates it everywhere it is used. To give an event a new, independent location instead, use "Create a New Location" or the event\'s own Location tab.'),
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
              'editable' => TRUE,
            ],
            [
              'type' => 'field',
              'key' => 'address_id.street_address',
              'dataType' => 'String',
              'label' => E::ts('Street Address'),
              'sortable' => TRUE,
              'editable' => TRUE,
            ],
            [
              'type' => 'field',
              'key' => 'address_id.city',
              'dataType' => 'String',
              'label' => E::ts('City'),
              'sortable' => TRUE,
              'editable' => TRUE,
            ],
            [
              'type' => 'field',
              'key' => 'address_id.country_id:label',
              'dataType' => 'String',
              'label' => E::ts('Country'),
              'sortable' => TRUE,
              'editable' => TRUE,
            ],
            [
              'type' => 'field',
              'key' => 'address_id.state_province_id:label',
              'dataType' => 'String',
              'label' => E::ts('State/Province'),
              'sortable' => TRUE,
              'editable' => TRUE,
            ],
            [
              'size' => 'btn-xs',
              'links' => [
                [
                  'path' => 'civicrm/manage-event-locations/events#/?loc_block_id=[id]',
                  'entity' => '',
                  'action' => '',
                  'join' => '',
                  'target' => '',
                  'icon' => 'fa-calendar',
                  'text' => E::ts('Events using this location'),
                  'style' => 'default',
                  'task' => '',
                  'conditions' => [
                    ['COUNT_LocBlock_Event_loc_block_id_01_id', '>', 0],
                  ],
                ],
              ],
              'type' => 'buttons',
              'alignment' => 'text-right',
            ],
            [
              'text' => '',
              'style' => 'default',
              'size' => 'btn-xs',
              'icon' => 'fa-bars',
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
