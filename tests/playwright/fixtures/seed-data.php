<?php

/**
 * Seeds the locations and events the Playwright suite looks up by name.
 * Run via `cv scr` (CiviCRM bootstrapped, $config/Civi\Api4 available).
 * Idempotent: safe to re-run against a database that already has this data.
 */

use Civi\Api4\Address;
use Civi\Api4\Email;
use Civi\Api4\Event;
use Civi\Api4\LocBlock;
use Civi\Api4\Phone;

$testData = json_decode(file_get_contents(__DIR__ . '/test-data.json'), TRUE);
$locationTypeId = CRM_Core_BAO_LocationType::getDefault()->id ?? 1;

function eml_seed_location(array $location, int $locationTypeId): int {
  // `address_id.name` is a plain implicit-join dot reference (LocBlock has
  // a direct address_id FK) - APIv4 auto-joins it. An explicit ->addJoin()
  // here collides with that auto-join and produces invalid SQL.
  $existing = LocBlock::get(FALSE)
    ->addWhere('address_id.name', '=', $location['name'])
    ->selectRowCount()
    ->execute();
  if ($existing->count()) {
    return LocBlock::get(FALSE)
      ->addWhere('address_id.name', '=', $location['name'])
      ->execute()->first()['id'];
  }

  $address = Address::create(FALSE)
    ->addValue('name', $location['name'])
    ->addValue('street_address', $location['street_address'])
    ->addValue('city', $location['city'])
    ->addValue('location_type_id', $locationTypeId)
    ->execute()->first();

  $email = Email::create(FALSE)
    ->addValue('email', strtolower(preg_replace('/[^a-z0-9]+/i', '', $location['name'])) . '@example.test')
    ->addValue('location_type_id', $locationTypeId)
    ->execute()->first();

  $phone = Phone::create(FALSE)
    ->addValue('phone', '0311122233')
    ->addValue('location_type_id', $locationTypeId)
    ->execute()->first();

  $locBlock = LocBlock::create(FALSE)
    ->addValue('address_id', $address['id'])
    ->addValue('email_id', $email['id'])
    ->addValue('phone_id', $phone['id'])
    ->execute()->first();

  return $locBlock['id'];
}

function eml_seed_event(array $event, ?int $locBlockId): int {
  $existing = Event::get(FALSE)
    ->addWhere('title', '=', $event['title'])
    ->selectRowCount()
    ->execute();
  if ($existing->count()) {
    return Event::get(FALSE)
      ->addWhere('title', '=', $event['title'])
      ->execute()->first()['id'];
  }

  $values = [
    'title' => $event['title'],
    'event_type_id:name' => 'Meeting',
    'start_date' => date('Y-m-d', strtotime('+30 days')),
    'is_active' => TRUE,
    'is_public' => TRUE,
  ];
  if ($locBlockId) {
    $values['loc_block_id'] = $locBlockId;
  }

  return Event::create(FALSE)->setValues($values)->execute()->first()['id'];
}

$locationIds = [];
foreach ($testData['locations'] as $key => $location) {
  $locationIds[$key] = eml_seed_location($location, $locationTypeId);
  echo "Location \"{$location['name']}\": LocBlock #{$locationIds[$key]}\n";
}

foreach ($testData['events'] as $key => $event) {
  $locBlockId = ($key === 'withLocationA') ? $locationIds['a'] : NULL;
  $eventId = eml_seed_event($event, $locBlockId);
  echo "Event \"{$event['title']}\": #{$eventId}\n";
}

echo "Done.\n";
