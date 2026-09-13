# Event manage locations (au.com.agileware.eventmanagelocations)

This is a [CiviCRM](https://civicrm.org) extension that prevents CiviCRM Events from re-using
existing Locations (`LocBlock`/address/email/phone records). By default, CiviCRM lets an
administrator pick an existing location for an Event and edit it in place - but because a
Location Block can be shared by multiple Events, editing it changes the location's address,
email, and phone details for *every* Event that uses it. This extension solves that problem by:

* Removing the **Use existing location** option from the **Location** tab of the Event
  Info form, so every Event always gets its own new Location Block when its location details
  are changed.
* Providing a **Manage Locations** search and edit UI so administrators can still find, review,
  and edit the Location Blocks that already exist in the system (outside of the Event form),
  including any Events that are still sharing a Location Block from before this extension was
  installed.

The extension is licensed under [AGPL-3.0](LICENSE.txt).

## Usage

### Creating/editing an Event location

On the **Location** tab of the CiviCRM Event Info form, the **Use existing location** selector is
removed. Whenever the address, email, or phone details are changed and the Event is saved, a new
Location Block is created for that Event rather than modifying a Location Block that might be
shared with other Events.

### Manage Locations

This extension also adds functionality to **manage existing locations**. A user with appropriate
permissions can search, insert, and edit Location Blocks directly (independent of any Event).

#### 1. Search Locations

A new custom search is added by this extension. Go to the following URL to find it:

```
civicrm/contact/search/custom/list
```

Look for **Search Locations (au.com.agileware.eventmanagelocations)**. Click on it to open the
**Locations Listing** search form.

Using this custom search, a user can search locations by the following parameters:

* Address name
* Street Address
* City
* Country
* State/Province

Click search without selecting anything to display all locations.

#### 2. Insert a new location

Click **Create a new location** in the top right corner of the content block to add a new
location. This opens the following URL:

```
civicrm/EditLocation
```

It displays a Location form similar to the Event Location form. A user can create a new location
by adding address details, emails, and phone numbers.

#### 3. Edit an existing location

Click **Edit** next to any record in the **Locations Listing** search results. This opens the
same form as inserting a new location, at the following URL:

```
civicrm/EditLocation?bid=LOCATION_BLOCK_ID
```

The form is pre-filled with the existing location's details. `LOCATION_BLOCK_ID` is the ID of the
`LocBlock` the user wants to edit.

Unlike the Event Location page, saving from this form **will not** create a new Location Block -
it updates the existing one in place. If the edited Location Block is shared by multiple Events, a
warning is shown indicating how many other Events use it, since the update will affect all of
them.

## Permissions

This extension adds a new CiviCRM permission, **Locations: Edit locations** (`edit locations`).
Users must be granted this permission (**Administer > Users and Permissions > Permissions
(Access Control)**) to save changes on the `civicrm/EditLocation` form; without it, the form
fields are displayed read-only (frozen). Access to load the Manage Locations search and edit pages
themselves only requires the standard **access CiviCRM** permission.

## Special configuration requirements

None. There are no settings pages, API credentials, or dependent extensions to configure - once
installed and enabled, the Event Location behaviour and Manage Locations search are immediately
available (subject to the permission described above).

## Requirements

* CiviCRM 5.27+

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
