#!/usr/bin/env bash
# Creates the WP roles/users and CiviCRM test data the Playwright suite needs.
#
# Assumes WordPress + CiviCRM + this extension are already installed/enabled.
# Runs with `wp`/`cv`/`php` on the PATH (true inside the CI WordPress
# container, and under `ddev exec` locally) - set CIVI_EXEC_PREFIX to wrap
# each call (e.g. `docker exec -u www-data -w /path/to/extension wordpress`)
# if running from outside that environment instead.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXEC_PREFIX=${CIVI_EXEC_PREFIX:-}

run() {
  $EXEC_PREFIX "$@"
}

json_get() {
  # $1 = json file, $2 = top-level key, $3 = nested key
  run php -r 'echo json_decode(file_get_contents($argv[1]), true)[$argv[2]][$argv[3]];' "$1" "$2" "$3"
}

USERS_JSON="$SCRIPT_DIR/test-users.json"

PRIV_USERNAME=$(json_get "$USERS_JSON" privileged username)
PRIV_PASSWORD=$(json_get "$USERS_JSON" privileged password)
PRIV_EMAIL=$(json_get "$USERS_JSON" privileged email)
PRIV_ROLE=$(json_get "$USERS_JSON" privileged role)

NONPRIV_USERNAME=$(json_get "$USERS_JSON" nonPrivileged username)
NONPRIV_PASSWORD=$(json_get "$USERS_JSON" nonPrivileged password)
NONPRIV_EMAIL=$(json_get "$USERS_JSON" nonPrivileged email)
NONPRIV_ROLE=$(json_get "$USERS_JSON" nonPrivileged role)

echo "Creating WP roles..."
# "edit all events" is CiviCRM core's own Event permission
# (CRM_Event_BAO_Event::checkPermission()) gating access to any Manage
# Event tab at all (including this extension's Location tab) - both test
# roles need it just to reach the tab. This extension's own "edit
# locations" permission is a separate, narrower gate within that tab
# (Create new location / the Edit Location form), which only the
# privileged role gets.
run wp role create "$PRIV_ROLE" "EML Privileged (test)" --clone=subscriber >/dev/null 2>&1 || true
run wp cap add "$PRIV_ROLE" "access CiviCRM" "access CiviEvent" "edit all events" "edit locations"

run wp role create "$NONPRIV_ROLE" "EML Non-Privileged (test)" --clone=subscriber >/dev/null 2>&1 || true
run wp cap add "$NONPRIV_ROLE" "access CiviCRM" "access CiviEvent" "edit all events"

echo "Creating WP users..."
if run wp user get "$PRIV_USERNAME" >/dev/null 2>&1; then
  run wp user update "$PRIV_USERNAME" --user_pass="$PRIV_PASSWORD" --role="$PRIV_ROLE"
else
  run wp user create "$PRIV_USERNAME" "$PRIV_EMAIL" --role="$PRIV_ROLE" --user_pass="$PRIV_PASSWORD"
fi

if run wp user get "$NONPRIV_USERNAME" >/dev/null 2>&1; then
  run wp user update "$NONPRIV_USERNAME" --user_pass="$NONPRIV_PASSWORD" --role="$NONPRIV_ROLE"
else
  run wp user create "$NONPRIV_USERNAME" "$NONPRIV_EMAIL" --role="$NONPRIV_ROLE" --user_pass="$NONPRIV_PASSWORD"
fi

echo "Seeding CiviCRM test data..."
run cv scr "$SCRIPT_DIR/seed-data.php"
