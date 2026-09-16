CRM.$(function($) {
  var $select = $('#loc_event_id');
  if (!$select.length) {
    return;
  }

  function reloadWith(param, value) {
    var url = window.location.href
      .replace(new RegExp('([?&])' + param + '=[^&]*&?'), '$1')
      .replace(/[?&]$/, '');
    url += (url.indexOf('?') === -1 ? '?' : '&') + param + '=' + encodeURIComponent(value);
    // These reloads are how the Choose Location options actually work in
    // this extension (see eventmanagelocations.php), not an incidental
    // navigation - so CiviCRM's own unsaved-changes prompt isn't relevant
    // here even switching away from "Create new location" with something
    // typed in; disarm it rather than asking.
    $(window).off('beforeunload');
    window.onbeforeunload = null;
    window.location.href = url;
  }

  if (window.eventmanagelocationsFrozen) {
    // Address.tpl always renders this wrapper (blockId=1), frozen fields
    // and all, so it's a stable anchor regardless of core template changes
    // elsewhere on the page.
    var $addressBlock = $('#Address_Block_1');
    if ($addressBlock.length) {
      var helpText = window.eventmanagelocationsCanEdit
        ? ts('These fields cannot be edited here because this location may be shared with other events. Use the Edit Location link above to make changes.')
        : ts('These fields cannot be edited here because this location may be shared with other events.');
      $('<h3/>')
        .text(ts('Existing Location Selected'))
        .insertBefore($addressBlock);
      $('<div class="help"/>')
        .text(helpText)
        .insertBefore($addressBlock);
    }
  }

  if (window.eventmanagelocationsCanEdit) {
    var $link = $('<a/>', {
      id: 'eventmanagelocations-edit-link',
      'class': 'button crm-hover-button',
      target: '_blank'
    })
      .css('margin-left', '8px')
      .text(ts('Edit Location'));

    $select.closest('td').append($link);

    (function updateLink() {
      var bid = $select.val();
      if (bid) {
        $link.attr('href', CRM.url('civicrm/EditLocation', {bid: bid, reset: 1})).show();
      }
      else {
        $link.hide();
      }
      $select.off('change.emlLink').on('change.emlLink', updateLink);
    })();

    // Whether address/email/phone are read-only static text or live inputs
    // is decided server-side (QuickForm's freeze(), driven by which choice
    // was in effect when the page rendered) - so a client-side-only radio
    // switch can't reveal the other state's fields, and (for "use existing")
    // core's own "N other events" message would be driven by a fresh AJAX
    // call that ignores our suppression of it. Reload either direction so
    // the server re-renders consistently with the choice actually made.
    $('input[name=location_option]').on('click', function() {
      var newOption = $(this).val();
      if (newOption === '1' && window.eventmanagelocationsFrozen) {
        reloadWith('_locOpt', '1');
      }
      else if (newOption === '2' && !window.eventmanagelocationsFrozen) {
        reloadWith('_locOpt', '2');
      }
    });
  }

  // Whichever LocBlock is selected, its address/email/phone are read-only
  // static text baked in at render time (see above) - core's own "populate
  // fields when loc_event_id changes" AJAX only updates the *visible* text
  // of a live, editable field, and (per eventmanagelocations.php) has its
  // own gaps even then. Reload with the new selection instead of trying to
  // patch that display in place, so the server renders the real,
  // consistent record for whatever was actually picked.
  $select.on('change', function() {
    var newLocId = $(this).val();
    if (window.eventmanagelocationsFrozen && newLocId && Number(newLocId) !== window.eventmanagelocationsCurrentLocId) {
      reloadWith('_locId', newLocId);
    }
  });
});
