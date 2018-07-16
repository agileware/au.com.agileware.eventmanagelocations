Event manage locations
=

This extension prevents reusing the location in an event. It ensures that when a location is changed in an event, a new location is created. It is done by removing option to **Use existing location** on **Event Location** Tab.

##Manage Locations

This extensions also adds functionality to **manage exisiting locations**. User can search/insert/edit a location.

###1. Search Locations 
A new custom search has been added by this extension. Go to following URL to find it,

```
civicrm/contact/search/custom/list
```

Look for **Search Locations (au.com.agileware.eventmanagelocations)**. Click on it to open **Locations Listing** search form.

Using this custom search User can search locations by following parameters,

* Address name
* Street Address
* City
* Country
* State/Province

Click on search without selecting anything to display all the locations.

### 2. Insert new location
Click on **Create a new location** in top right corner of the content block to add a new location. This would open the following URL,

```
civicrm/EditLocation
```

It displays Location form which is similar to Event location form. User can create new form by adding address details, emails and phone numbers.

### 3. Edit existing location

Click on **Edit** option of any record from **Locations Listing** Search result. This would open the same form as **insert new location** on following URL.

```
civicrm/Editlocation?bid=LOCATION_BLOCK_ID
```
Form on this page would be pre-filled with exisiting location details.
**LOCATION_BLOCK_ID** denotes the location block user wants to edit. 

Unlike **Event location** page, clicking on save from this form **will not** create new address.


##Support and questions

This CiviCRM extension was developed by Agileware, https://agileware.com.au

Agileware can be contracted for CiviCRM development and support services. Email: [sales@agileware.com.au](mailto:sales@agileware.com.au)