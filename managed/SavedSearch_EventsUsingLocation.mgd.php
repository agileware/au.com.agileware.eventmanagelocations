<?php
use CRM_Eventmanagelocations_ExtensionUtil as E;

return [
  [
    'name' => 'SavedSearch_EventsUsingLocation',
    'entity' => 'SavedSearch',
    'cleanup' => 'unused',
    'update' => 'unmodified',
    'params' => [
      'version' => 4,
      'values' => [
        'name' => 'EventsUsingLocation',
        'label' => E::ts('Events Using This Location'),
        'api_entity' => 'Event',
        'api_params' => [
          'version' => 4,
          'select' => [
            'id',
            'title',
            'start_date',
            'is_active',
          ],
          'orderBy' => [],
          'where' => [],
          'groupBy' => [],
          'join' => [],
          'having' => [],
        ],
        'description' => E::ts('Lists the Events currently using a given Event Location. The Location is chosen at runtime via the loc_block_id URL parameter, not baked into this search.'),
      ],
      'match' => [
        'name',
      ],
    ],
  ],
  [
    'name' => 'SavedSearch_EventsUsingLocation_SearchDisplay_EventsUsingLocation_Table_1',
    'entity' => 'SearchDisplay',
    'cleanup' => 'unused',
    'update' => 'unmodified',
    'params' => [
      'version' => 4,
      'values' => [
        'name' => 'EventsUsingLocation_Table_1',
        'label' => E::ts('Events Using This Location'),
        'saved_search_id.name' => 'EventsUsingLocation',
        'type' => 'table',
        'settings' => [
          'description' => E::ts('Select one or more Events below, then use Actions > Update Events to re-assign them to a different Location.'),
          'sort' => [
            ['start_date', 'DESC'],
          ],
          'limit' => 50,
          'pager' => [],
          'placeholder' => 5,
          'columns' => [
            [
              'type' => 'field',
              'key' => 'title',
              'dataType' => 'String',
              'label' => E::ts('Event Title'),
              'sortable' => TRUE,
              'link' => [
                'path' => 'civicrm/event/manage/settings?reset=1&action=update&id=[id]',
                'entity' => '',
                'action' => '',
                'join' => '',
                'target' => '',
              ],
            ],
            [
              'type' => 'field',
              'key' => 'start_date',
              'dataType' => 'Timestamp',
              'label' => E::ts('Event Start Date'),
              'sortable' => TRUE,
            ],
            [
              'type' => 'field',
              'key' => 'is_active',
              'dataType' => 'Boolean',
              'label' => E::ts('Is Active'),
              'sortable' => TRUE,
              'editable' => TRUE,
            ],
          ],
          'actions' => ['update'],
          'classes' => [
            'table',
            'table-striped',
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
