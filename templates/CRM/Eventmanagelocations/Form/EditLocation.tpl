{*
 +--------------------------------------------------------------------+
 | CiviCRM version 4.6                                                |
 +--------------------------------------------------------------------+
 | Copyright CiviCRM LLC (c) 2004-2015                                |
 +--------------------------------------------------------------------+
 | This file is a part of CiviCRM.                                    |
 |                                                                    |
 | CiviCRM is free software; you can copy, modify, and distribute it  |
 | under the terms of the GNU Affero General Public License           |
 | Version 3, 19 November 2007 and the CiviCRM Licensing Exception.   |
 |                                                                    |
 | CiviCRM is distributed in the hope that it will be useful, but     |
 | WITHOUT ANY WARRANTY; without even the implied warranty of         |
 | MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.               |
 |                                                                    |
 | You should have received a copy of the GNU Affero General Public   |
 | License and the CiviCRM Licensing Exception along                  |
 | with this program; if not, contact CiviCRM LLC                     |
 | at info[AT]civicrm[DOT]org. If you have questions about the        |
 | GNU Affero General Public License or the licensing of CiviCRM,     |
 | see the CiviCRM license FAQ at http://civicrm.org/licensing        |
 +--------------------------------------------------------------------+
*}

{if $message}
  <div id="help">
    {$message}
  </div>
{/if}

<div class="crm-block crm-form-block crm-event-manage-location-form-block">
<div class="crm-submit-buttons">
   {include file="CRM/common/formButtons.tpl" location="top"}
  {if $loc_srch_url}
  <a class="crm-form-submit button"  href="{$loc_srch_url}" style="padding-top: 3px;padding-bottom: 3px;">Back to search results</a>
  {/if}
</div>

    <div id="newLocation">
      <h3>Address</h3>
    {* Display the address block *}
    {include file="CRM/Contact/Form/Edit/Address.tpl" blockId=1}

    {* Display the email and phone blocks. Deliberately not reusing the
       generic CRM/Contact/Form/Edit/Email|Phone.tpl here - those render a
       contact's location type/on-hold/bulk-mail/is-primary controls and
       support an unlimited, dynamically-added number of blocks, none of
       which apply to an event's location. This mirrors the minimal markup
       CiviCRM core itself uses for CRM_Event_Form_ManageEvent_Location. *}
    <table class="form-layout-compressed">
      <tr>
        <td>{$form.email.1.email.label}</td>
        <td>{$form.email.1.email.html|crmAddClass:email}</td>
        {include file="CRM/Contact/Form/Inline/BlockCustomData.tpl" entity=email customFields=$custom_fields_email blockId=1 actualBlockCount=2}
      </tr>
      <tr>
        <td>{$form.email.2.email.label}</td>
        <td>{$form.email.2.email.html|crmAddClass:email}</td>
        {include file="CRM/Contact/Form/Inline/BlockCustomData.tpl" entity=email customFields=$custom_fields_email blockId=2 actualBlockCount=2}
      </tr>
      <tr>
        <td>{$form.phone.1.phone.label}</td>
        <td>{$form.phone.1.phone.html|crmAddClass:phone} {$form.phone.1.phone_ext.label}&nbsp;{$form.phone.1.phone_ext.html|crmAddClass:four}&nbsp;{$form.phone.1.phone_type_id.html}</td>
      </tr>
      <tr>
        <td>{$form.phone.2.phone.label}</td>
        <td>{$form.phone.2.phone.html|crmAddClass:phone} {$form.phone.2.phone_ext.label}&nbsp;{$form.phone.2.phone_ext.html|crmAddClass:four}&nbsp;{$form.phone.2.phone_type_id.html}</td>
      </tr>
    </table>
<div class="crm-submit-buttons">
   {include file="CRM/common/formButtons.tpl" location="bottom"}
</div>
</div>
</div>

<script type="text/javascript">
{literal}
CRM.$(function($) {
  var title = {/literal}"{$loc_edit_title}"{literal};

  if (title.length) {
    document.title = title;
  }
});
{/literal}
</script>
