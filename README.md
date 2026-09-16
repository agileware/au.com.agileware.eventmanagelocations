# Event manage locations (au.com.agileware.eventmanagelocations)

This is a [CiviCRM](https://civicrm.org) extension that changes how the **Location** tab of the
CiviCRM Event Info form works, so that Locations (`LocBlock`/address/email/phone records) can be
safely shared between Events:

* Every user can pick **Use existing location** and choose from the full list of locations known
  to the system - not just ones already attached to some other Event. Once selected, that
  location's address, email, and phone fields are shown **read-only**, since editing them there
  would silently change the details for every other Event sharing that location too.
* Only users with the **CiviEvent: edit locations** permission (see [Permissions](#permissions)
  below) additionally get a **Create new location** option, with normal editable fields, and an
  **Edit Location** link next to the location picker for editing the selected location itself
  (which does update it in place, deliberately, for every Event that shares it).
* A **Manage Event Locations** search screen lists that same full pool of locations, so an
  administrator can review, edit, or pre-create locations independently of any Event.

The extension is licensed under [AGPL-3.0](LICENSE.txt).

## Usage

### Creating/editing an Event location

On the **Location** tab of the CiviCRM Event Info form (**Events > Manage Events > (an event) >
Location**):

* **Use existing location** shows a dropdown of every known location. Selecting one loads its
  address, email, and phone details as read-only text, along with a note explaining why they can't
  be edited there. Saving attaches the event to that location without creating or changing any
  records.
* **Create new location** (only shown to users with the `edit locations` permission) shows blank,
  editable address/email/phone fields (defaulting to the site's configured country/state, the same
  as an Event with no location at all). Saving creates a brand new, independent location for this
  event only.
* Switching between the two options, or between different existing locations, reloads the page
  rather than trying to update the fields in place - this keeps the read-only/editable state and
  the field contents consistent with whichever option is actually selected.

A location that's still attached to at least one other Event isn't deleted just because this Event
stops using it (whether by switching to "Create new location" or to a different existing
location) - it stays available in the pool for later reuse, exactly like a location that was never
attached to an Event in the first place.

### Manage Event Locations

This extension also adds a **Manage Event Locations** search screen (under **Events**) for finding
and maintaining locations independently of any Event.

Go to the following URL, or use the **Manage Event Locations** entry under the **Events** menu:

```
civicrm/manage-event-locations
```

This lists every location with an address on file - the same full pool the Event Location tab's
"Use existing location" picker offers, whether or not any Event is currently using it. It can be
filtered by address name, street address, city, country, and state/province. Each row has links to:

* **Edit Location** - opens the same form described below, at `civicrm/EditLocation?bid=ID`.
* **Update Address** / **Delete Address** - inline actions on the underlying Address record.

Editing an address here (or via **Edit Location**) updates it everywhere it's used. To give an
Event a new, independent location instead, use **Create a New Location** (also available from this
screen) or the Event's own Location tab.

### The Edit Location form

Both the **Manage Event Locations** screen and the "Edit Location" link on an Event's Location tab
lead to:

```
civicrm/EditLocation?bid=LOCATION_BLOCK_ID
```

(or `civicrm/EditLocation` with no `bid`, to create a new location from scratch). This form is
pre-filled with the existing location's details when editing. `LOCATION_BLOCK_ID` is the ID of the
`LocBlock` being edited.

Saving from this form updates the existing Location Block in place rather than creating a new one.
Since a Location Block can be shared by multiple Events, this changes the location's address,
email, and phone details for *every* Event that uses it.

## Permissions

This extension adds a new CiviCRM permission, **CiviEvent: edit locations** (`edit locations`,
described to users as "Allows users to edit event locations").
Users must be granted this permission (**Administer > Users and Permissions > Permissions
(Access Control)**) to:

* See and use the **Create new location** option on an Event's Location tab (without it, only
  **Use existing location** is available).
* Save changes on the `civicrm/EditLocation` form; without it, the form's fields are displayed
  read-only (frozen).

Access to the Event Location tab itself, and to the **Manage Event Locations** search screen,
only requires the standard **access CiviEvent** and **access CiviCRM** permissions.

## Special configuration requirements

None. There are no settings pages, API credentials, or dependent extensions to configure - once
installed and enabled, the Event Location behaviour and Manage Event Locations search are
immediately available (subject to the permissions described above).

## Requirements

* CiviCRM 5.51+ (uses APIv4 and SearchKit)

## Installation (Web UI)

Learn more about installing CiviCRM extensions in the [CiviCRM Sysadmin
Guide](https://docs.civicrm.org/sysadmin/en/latest/customize/extensions/).

# About the Authors

This CiviCRM extension was developed by the team at [Agileware](https://agileware.com.au).

[Agileware](https://agileware.com.au) provide a range of CiviCRM services including:

  * CiviCRM migration
  * CiviCRM integration
  * CiviCRM extension development
  * CiviCRM support
  * CiviCRM hosting
  * CiviCRM remote training services

Support your Australian [CiviCRM](https://civicrm.org) developers, [contact Agileware](https://agileware.com.au/contact) today!


![Agileware](logo/agileware-logo.png)
