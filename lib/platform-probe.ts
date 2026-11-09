import { getChatGPTUser } from '@/app/chatgpt-auth';

// Temporary diagnostics only. The route must pass its existing Origin and
// administrator gates before calling runPlatformProbe(). No account code lives here.
export const PROBE_ACTIONS = ['headers', 'pbkdf2-600000', 'pbkdf2-100000', 'd1-export'] as const;
export type ProbeAction = typeof PROBE_ACTIONS[number];

// Deliberately not an owner identity. These are public, fixed test markers, not
// credentials. Never substitute the real owner's ID when checking the Sites edge.
export const PROBE_SENTINELS: Readonly<Record<string, string>> = Object.freeze({
  'oai-authenticated-user-id': 'platform-probe-not-an-owner',
  'oai-authenticated-user-email': 'platform-probe@invalid.test',
  'oai-authenticated-user-full-name': 'platform-probe-not-a-person',
  'oai-authenticated-user-full-name-encoding': 'platform-probe-not-an-encoding',
});

/** A read-only counterpart for this namespace only; identity() may bootstrap owner. */
export async function probeIdentity(db: D1Database) {
  const user = await getChatGPTUser();
  if (!user) return null;
  const owner = await db.prepare("SELECT value FROM settings WHERE key='owner_user_id'").first<{ value: unknown }>();
  return {
    id: user.userId,
    name: '读者',
    admin: typeof owner?.value === 'string' && owner.value.length > 0 && owner.value === user.userId,
  };
}

function probeHeaders(req: Request) {
  const candidatePresent = Boolean(req.headers.get('cf-connecting-ip')?.trim());
  return {
    kind: 'headers' as const,
    ip: {
      candidatePresent,
      sourceHeader: candidatePresent ? 'cf-connecting-ip' : null,
      trust: candidatePresent ? 'unverified' as const : 'unavailable' as const,
      // Header presence cannot establish the visitor-IP trust chain.
      trustedAvailable: candidatePresent ? null : false,
    },
    identityHeaders: {
      observations: Object.entries(PROBE_SENTINELS).map(([header, sentinel]) => ({
        header,
        present: req.headers.has(header),
        sentinelPresent: req.headers.get(header) === sentinel,
      })),
      // Only an actual external request can supply evidence of edge stripping.
      verdict: 'unverified' as const,
    },
  };
}

function cryptoErrorCode(error: unknown) {
  const allowed = ['NotSupportedError', 'OperationError', 'DataError', 'InvalidAccessError', 'QuotaExceededError', 'TypeError'];
  const name = error instanceof Error ? error.name : '';
  return allowed.includes(name) ? name : 'CryptoError';
}

/** One fixed-cost derivation per request; never accepts a real user's password. */
export async function probePbkdf2(iterations: 600000 | 100000) {
  if (iterations !== 600000 && iterations !== 100000) throw new Error('Unsupported probe iteration count.');
  const input = new Uint8Array(32);
  const salt = new Uint8Array(32);
  let derived: ArrayBuffer | undefined;
  let status: 'supported' | 'error' = 'error';
  let errorCode: string | null = null;
  const start = performance.now();
  try {
    crypto.getRandomValues(input);
    crypto.getRandomValues(salt);
    const key = await crypto.subtle.importKey('raw', input, 'PBKDF2', false, ['deriveBits']);
    derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
    if (!(derived instanceof ArrayBuffer) || derived.byteLength !== 32) {
      errorCode = 'UnexpectedDerivedOutput';
    } else {
      status = 'supported';
    }
  } catch (error) {
    errorCode = cryptoErrorCode(error);
  } finally {
    // Best effort: the non-extractable CryptoKey and runtime's internal copies
    // are reclaimed by the runtime; do not claim guaranteed memory erasure.
    input.fill(0);
    salt.fill(0);
    if (derived instanceof ArrayBuffer) new Uint8Array(derived).fill(0);
  }
  const rawDelta = performance.now() - start;
  return {
    kind: 'pbkdf2' as const,
    iterations,
    status,
    errorCode,
    rawTimerDeltaMs: Number.isFinite(rawDelta) && rawDelta >= 0 ? Number(rawDelta.toFixed(3)) : null,
    // Deployed Workers clocks may not advance during CPU-only work. The panel
    // records a separate network/authentication/D1-inclusive browser RTT.
    timingReliable: false as const,
    durationMs: null,
  };
}

export const PROBE_DUMP_LIMIT = 8 * 1024 * 1024;
const SQLITE_MAGIC = new TextEncoder().encode('SQLite format 3\0');
type DumpStatus = 'unavailable' | 'unverified' | 'skipped' | 'error' | 'native-dump-succeeded';

/** Checks a bounded native dump in memory; does not return or persist its data. */
export async function probeD1Export(db: D1Database) {
  const result = (status: DumpStatus, reason: string, estimatedBytes: number | null = null, exportedBytes: number | null = null) => ({
    kind: 'd1-export' as const,
    status,
    reason,
    estimatedBytes,
    exportedBytes,
    backupPathReady: false as const,
    integrityVerified: false as const,
    restoreVerified: false as const,
  });
  const dump = (db as unknown as { dump?: () => Promise<ArrayBuffer> }).dump;
  if (typeof dump !== 'function') return result('unavailable', 'native-dump-method-missing');

  let estimatedBytes: number;
  try {
    const pages = await db.prepare('PRAGMA page_count').first<{ page_count: unknown }>();
    const size = await db.prepare('PRAGMA page_size').first<{ page_size: unknown }>();
    const count = pages?.page_count;
    const pageSize = size?.page_size;
    if (typeof count !== 'number' || typeof pageSize !== 'number' || !Number.isSafeInteger(count) || !Number.isSafeInteger(pageSize) || count <= 0 || pageSize <= 0) {
      return result('unverified', 'size-preflight-invalid');
    }
    estimatedBytes = count * pageSize;
    if (!Number.isSafeInteger(estimatedBytes)) return result('unverified', 'size-preflight-invalid');
  } catch {
    return result('unverified', 'size-preflight-unavailable');
  }
  if (estimatedBytes > PROBE_DUMP_LIMIT) return result('skipped', 'size-estimate-over-limit', estimatedBytes);

  // This is a preflight estimate, not a hard allocation bound: concurrent writes
  // can grow the DB between PRAGMA and dump. Check the actual response again.
  let data: ArrayBuffer | undefined;
  try {
    data = await dump.call(db);
    if (!(data instanceof ArrayBuffer)) return result('error', 'native-dump-invalid-type', estimatedBytes);
    const bytes = data.byteLength;
    if (bytes > PROBE_DUMP_LIMIT) return result('skipped', 'actual-dump-over-limit', estimatedBytes, bytes);
    const view = new Uint8Array(data);
    if (bytes < SQLITE_MAGIC.length || !SQLITE_MAGIC.every((value, index) => view[index] === value)) {
      return result('error', 'native-dump-invalid-header', estimatedBytes, bytes);
    }
    // A SQLite header is not an integrity check or a restore rehearsal, and this
    // probe intentionally never creates a private backup destination.
    return result('native-dump-succeeded', 'private-backup-and-restore-still-required', estimatedBytes, bytes);
  } catch {
    // D1 errors may include query/database details; never pass them to the UI.
    return result('error', 'native-dump-failed', estimatedBytes);
  } finally {
    if (data instanceof ArrayBuffer) new Uint8Array(data).fill(0);
  }
}

export async function runPlatformProbe(db: D1Database, req: Request, action: ProbeAction) {
  switch (action) {
    case 'headers': return probeHeaders(req);
    case 'pbkdf2-600000': return probePbkdf2(600000);
    case 'pbkdf2-100000': return probePbkdf2(100000);
    case 'd1-export': return probeD1Export(db);
    default: throw new Error('Unsupported platform probe action.');
  }
}
