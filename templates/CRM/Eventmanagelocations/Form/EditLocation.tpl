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

{if $addBlock}
{include file="CRM/Contact/Form/Edit/$blockName.tpl"}
{else}
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
    {include file="CRM/Contact/Form/Edit/Address.tpl"}
  <table class="form-layout-compressed">
    {* Display the email block(s) *}
    {include file="CRM/Contact/Form/Edit/Email.tpl"}

    {* Display the phone block(s) *}
    {include file="CRM/Contact/Form/Edit/Phone.tpl"}
    </table>
<div class="crm-submit-buttons">
   {include file="CRM/common/formButtons.tpl" location="bottom"}
</div>
</div>
</div>
  </div>

{include file="CRM/common/additionalBlocks.tpl"}
<script type="text/javascript">
{literal}
CRM.$(function($) {

  var title = {/literal}"{$loc_edit_title}"{literal};

  if(title.length){
      document.title = title;
  }


  //FIX ME: by default load 2 blocks and hide add and delete links
  //we should make additional block function more flexible to set max block limit
  buildBlocks('Email');
  buildBlocks('Phone');

  var $form = $('form.{/literal}{$form.formClass}{literal}'),
    locBlockId = {/literal}"{$form.loc_event_id.value.0}"{literal};

  displayMessage({/literal}{$locUsed}{literal});

  // build blocks only if it is not built
  function buildBlocks(element) {
    if (!$('[id='+ element +'_Block_2]').length) {
      buildAdditionalBlocks(element, 'CRM_Event_Form_ManageEvent_Location');
    }
  }

  hideAddDeleteLinks('Email');
  hideAddDeleteLinks('Phone');
  function hideAddDeleteLinks(element) {
    $('#add'+ element, $form).hide();
    $('[id='+ element +'_Block_2] a:last', $form).hide();
  }

  $('#loc_event_id', $form).change(function() {
    $.ajax({
      url: CRM.url('civicrm/ajax/locBlock', 'reset=1'),
      data: {'lbid': $(this).val()},
      dataType: 'json',
      success: function(data) {
        var selectLocBlockId = $('#loc_event_id').val();
        // Only change state when options are loaded
        if (data.address_1_state_province_id) {
          var defaultState = data.address_1_state_province_id;
          $('#address_1_state_province_id', $form).one('crmOptionsUpdated', function() {
            $(this).val(defaultState).change();
          });
          delete data.address_1_state_province_id;
        }
        for(i in data) {
          if ( i == 'count_loc_used' ) {
            if ( ((selectLocBlockId == locBlockId) && data.count_loc_used > 1) ||
                 ((selectLocBlockId != locBlockId) && data.count_loc_used > 0) ) {
              displayMessage(data.count_loc_used);
            } else {
              displayMessage(0);
            }
          } else {
            $('#'+i, $form).val(data[i]).change();
          }
        }
      }
    });
    return false;
  });

  function displayMessage(count) {
    if (count) {
      var msg = {/literal}'{ts escape="js" 1="%1"}This location is used by %1 other events. Modifying location information will change values for all events.{/ts}'{literal};
      $('#locUsedMsg', $form).text(ts(msg, {1: count})).addClass('status');
    } else {
      $('#locUsedMsg', $form).text(' ').removeClass('status');
    }
  }
});
{/literal}
</script>

{/if} {* add block if end*}
