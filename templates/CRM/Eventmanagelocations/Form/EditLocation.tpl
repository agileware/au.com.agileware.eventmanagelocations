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
 | See the GNU Affero General Public License for more details.        |
 |                                                                    |
 | You should have received a copy of the GNU Affero General Public   |
 | License and the CiviCRM Licensing Exception along                  |
 | with this program; if not, contact CiviCRM LLC                     |
 | at info[AT]civicrm[DOT]org. If you have questions about the        |
 | GNU Affero General Public License or the licensing of CiviCRM,     |
 | see the CiviCRM license FAQ at http://civicrm.org/licensing        |
 +--------------------------------------------------------------------+
*}

{* this template used to build location block *}
{if !$addBlock}
  {if $message}
    <div id="help">
      {$message}
    </div>
  {/if}
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
  {include file="CRM/Contact/Form/Edit/Address.tpl" blockId=1 masterAddress='' parseStreetAddress='' className='CRM_Eventmanagelocations_Form_EditLocation'}
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
  </div>
