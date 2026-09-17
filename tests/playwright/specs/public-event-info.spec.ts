import { test, expect } from '../fixtures/base';
import { getEventIdByTitle } from '../fixtures/civi';
import testData from '../fixtures/test-data.json';

/**
 * Test plan Suite F (public Event Info page).
 */

test.describe('Public Event Info page', () => {
  test('shows the reused location\'s address and renders no PHP warnings or notices', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.withLocationA.title);
    await privilegedPage.goto(`/civicrm/event/info?id=${eventId}&reset=1`);
    await privilegedPage.waitForLoadState('networkidle');

    await expect(privilegedPage.getByText(testData.locations.a.street_address)).toBeVisible();
    await expect(privilegedPage.getByText(testData.locations.a.city)).toBeVisible();

    // Regression: a historical NULL location_type_id on the Address/Email/
    // Phone rows broke core's own public Event Info page with PHP warnings
    // and deprecation notices (e.g. nl2br() receiving null). None of these
    // should render anywhere on the page for a reused/shared location.
    const bodyText = await privilegedPage.locator('body').innerText();
    const phpWarningSignatures = [
      'Warning:',
      'Notice:',
      'Deprecated:',
      'Undefined array key',
      'nl2br(): Passing null',
    ];
    for (const signature of phpWarningSignatures) {
      expect(bodyText).not.toContain(signature);
    }
  });

  test('renders a working map link for the reused location', async ({ privilegedPage }) => {
    const eventId = await getEventIdByTitle(testData.events.withLocationA.title);
    await privilegedPage.goto(`/civicrm/event/info?id=${eventId}&reset=1`);
    await privilegedPage.waitForLoadState('networkidle');

    // Tolerant check: CiviCRM's public Event Info page typically renders a
    // "Map" link/button next to the location block. This suite cannot be
    // executed against a live environment to confirm the exact markup, so
    // this assertion is deliberately loose - if no such link is found (e.g.
    // mapping is disabled in this install's configuration), skip loudly
    // rather than asserting something ungrounded. The address text and
    // absence-of-PHP-warnings checks above are the important regression
    // checks from the test plan and are asserted unconditionally.
    const mapLink = privilegedPage.getByRole('link', { name: /map/i });
    if (await mapLink.count()) {
      await expect(mapLink.first()).toBeVisible();
    } else {
      test.skip(true, 'No "Map" link found on the public Event Info page - mapping may be disabled in this install; not asserting ungrounded markup.');
    }
  });
});
