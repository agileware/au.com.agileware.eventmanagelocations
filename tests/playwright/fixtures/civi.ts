import { execFileSync } from 'node:child_process';

/**
 * Shells out to `cv api4` to read/write CiviCRM data directly, bypassing the
 * browser. Suite C/D/E of the test plan need this: the whole point of those
 * regressions was invisible data loss (duplicated/deleted LocBlocks, NULL
 * location_type_id) that looked fine in the UI at a glance.
 *
 * CIVI_EXEC_PREFIX (set by the CI workflow to a `docker exec ...` command
 * targeting the WordPress container) is prepended to `cv`. Locally, e.g.
 * under ddev, set it to something like `ddev exec -s web` instead.
 */
function execPrefixParts(): string[] {
  const prefix = process.env.CIVI_EXEC_PREFIX;
  return prefix ? prefix.split(' ').filter(Boolean) : [];
}

export function civiApi4<T = any>(entityDotAction: string, params: Record<string, unknown> = {}): T {
  const args = [...execPrefixParts(), 'cv', 'api4', entityDotAction, JSON.stringify(params)];
  const [cmd, ...rest] = args;
  const out = execFileSync(cmd, rest, { encoding: 'utf-8' });
  return JSON.parse(out);
}

export function civiApi4Single<T = any>(entityDotAction: string, params: Record<string, unknown> = {}): T {
  const results = civiApi4<T[]>(entityDotAction, params);
  if (!results.length) {
    throw new Error(`cv api4 ${entityDotAction} returned no results for ${JSON.stringify(params)}`);
  }
  return results[0];
}

export function getLocBlockIdByLocationName(name: string): number {
  const rows = civiApi4<Array<{ id: number }>>('LocBlock.get', {
    where: [['address_id.name', '=', name]],
    select: ['id'],
  });
  if (!rows.length) {
    throw new Error(`No LocBlock found for location named "${name}" - has the test data been seeded?`);
  }
  return rows[0].id;
}

/**
 * Looks up a LocBlock's Address by going LocBlock -> address_id -> Address in
 * two plain, join-free calls, rather than an explicit `addJoin` in the
 * reverse direction (Address has no direct FK to LocBlock, only the other
 * way around - an explicit join here needs its own ON condition to be
 * reliable, so this sidesteps that entirely).
 */
export function getAddressByLocBlockId<T = any>(locBlockId: number, select: string[]): T {
  const locBlock = civiApi4Single<{ address_id: number }>('LocBlock.get', {
    where: [['id', '=', locBlockId]],
    select: ['address_id'],
  });
  return civiApi4Single<T>('Address.get', {
    where: [['id', '=', locBlock.address_id]],
    select,
  });
}

/**
 * Looks up a location's Address directly by its own `name`, in a single
 * call - unlike getLocBlockIdByLocationName() + getAddressByLocBlockId(),
 * this can't race a concurrently-running test that recreates the location's
 * LocBlock/Address under a new id (e.g. by switching an event away from a
 * shared location - see _eventmanagelocations_restore_locblock_if_deleted())
 * in the gap between looking up the id and looking up by it.
 */
export function getAddressByLocationName<T = any>(name: string, select: string[]): T {
  return civiApi4Single<T>('Address.get', {
    where: [['name', '=', name]],
    select,
  });
}

export function getEventIdByTitle(title: string): number {
  const rows = civiApi4<Array<{ id: number }>>('Event.get', {
    where: [['title', '=', title]],
    select: ['id'],
  });
  if (!rows.length) {
    throw new Error(`No Event found titled "${title}" - has the test data been seeded?`);
  }
  return rows[0].id;
}
