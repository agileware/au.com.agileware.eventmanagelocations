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

<script type="text/javascript">
{literal}
CRM.$(function($) {
  var title = {/literal}"{$loc_srch_title}"{literal};

  if(title.length){
      document.title = title;
  }

});
{/literal}
</script>


{* Default template custom searches. This template is used automatically if templateFile() function not defined in
   custom search .php file. If you want a different layout, clone and customize this file and point to new file using
   templateFile() function.*}

<div class="crm-block crm-form-block crm-contact-custom-search-form-block">
  <details class="crm-accordion-light crm_location_search-accordion" {if $rows}{else}open{/if}>
    <a name="new_location"  href="{crmURL p="civicrm/EditLocation" h=0}" class="crm-form-submit" style="float: right; display: inline-block;" target="_self">Create a new location</a>
    <summary>
      <p>{ts}Find Locations{/ts}</p>
    </summary><!-- /.crm-accordion-header -->
    <div class="crm-accordion-body">
      <div id="searchForm" class="crm-block crm-form-block crm-contact-custom-search-location-search-fomr-block">
        <div class="crm-submit-buttons">{include file="CRM/common/formButtons.tpl" location="top"}</div>
        <table class="form-layout-compressed">
            {* Loop through all defined search criteria fields (defined in the buildForm() function). *}
            {foreach from=$elements item=element}
                <tr class="crm-contact-custom-search-form-row-{$element}">
                    <td class="label">{$form.$element.label}</td>
                    {if $element eq 'start_date'}
                        <td>{include file="CRM/common/jcalendar.tpl" elementName=start_date}</td>
                    {elseif $element eq 'end_date'}
                        <td>{include file="CRM/common/jcalendar.tpl" elementName=end_date}</td>
                    {else}
                        <td>{$form.$element.html}</td>
                    {/if}
                </tr>
            {/foreach}
        </table>
        <div class="crm-submit-buttons">{include file="CRM/common/formButtons.tpl" location="bottom"}</div>
      </div>
    </div>
</details>
</div><!-- /.crm-form-block -->


{if $rowsEmpty || $rows}
<div class="crm-content-block">
{if $rowsEmpty}
  <div class="crm-results-block crm-results-block-empty">
    {include file="CRM/Contact/Form/Search/Custom/EmptyResults.tpl"}
  </div>
{/if}

{if $summary}
    {$summary.summary}: {$summary.total}
{/if}

{if $rows}
  <div class="crm-results-block">
    {* Search request has returned 1 or more matching rows. Display results and collapse the search criteria fieldset. *}
        {* This section handles form elements for action task select and submit *}
       <div class="crm-search-tasks">
         <div id="search-status">
          <table class="form-layout-compressed">
          <tr>
            <td class="font-size12pt" style="width: 30%;">
                {ts count=$pager->_totalItems plural='Found: %count Location Blocks'}Found: %count Location Blocks{/ts}
            </td>
          </tr>
          </table>
         </div>
    </div>
        {* This section displays the rows along and includes the paging controls *}
      <div class="crm-search-results">

        {include file="CRM/common/pager.tpl" location="top"}

        {* Include alpha pager if defined. *}
        {if $atoZ}
            {include file="CRM/common/pagerAToZ.tpl"}
        {/if}

        {strip}
        <table class="selector row-highlight" summary="{ts}Search results listings.{/ts}">
            <thead class="sticky">
                <tr>
                {foreach from=$columnHeaders item=header}
                    <th scope="col">
                        {if $header.sort}
                            {assign var='key' value=$header.sort}
                            {$sort->_response.$key.link}
                        {else}
                            {$header.name}
                        {/if}
                    </th>
                {/foreach}
                <th>&nbsp;</th>
                </tr>
            </thead>

            {counter start=0 skip=1 print=false}
            {foreach from=$rows item=row}
                <tr id='rowid{$row.contact_id}' class="{cycle values="odd-row,even-row"}">
                    {foreach from=$columnHeaders item=header}
                        {assign var=fName value=$header.sort}
                            <td>{$row.$fName}</td>
                    {/foreach}
                    <td><a href="{crmURL p="civicrm/EditLocation" q="bid=`$row.location_block_id`" h=0}" class="action-item crm-hover-button no-popup">Edit</a></td>
                </tr>
            {/foreach}
        </table>
        {/strip}

        {include file="CRM/common/pager.tpl" location="bottom"}

        </p>
    {* END Actions/Results section *}
    </div>
    </div>
{/if}


</div>
{/if}
