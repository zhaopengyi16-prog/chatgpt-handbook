// Temporary, read-only platform probes for the account phase-one gate
// (docs/ACCOUNTS_DESIGN.md). They report only header names, counts and
// address families — never header values, IP addresses or identities — and
// never read or write D1. Remove this module and its routes after the
// results are recorded.

const IP_HEADERS = [
  'cf-connecting-ip',
  'cf-connecting-ipv6',
  'cf-pseudo-ipv4',
  'true-client-ip',
  'x-real-ip',
  'x-forwarded-for',
  'forwarded',
] as const;

const IDENTITY_HEADERS = ['oai-authenticated-user-id', 'oai-authenticated-user-email'] as const;

export type AddressFamily = 'ipv4' | 'ipv6' | 'other';
export type IpHeaderReport = {present: boolean; entries: number; families: AddressFamily[]};

export function addressFamily(raw: string): AddressFamily {
  let value = raw.trim();
  // RFC 7239 `for=` values may be quoted and bracketed, with an optional port.
  value = value.replace(/^for=/i, '').replace(/^"|"$/g, '');
  if (value.startsWith('[')) value = value.slice(1, value.indexOf(']') > 0 ? value.indexOf(']') : undefined);
  if (/^\d{1,3}(\.\d{1,3}){3}(:\d+)?$/.test(value)) return 'ipv4';
  if (/^[0-9a-f:.]+$/i.test(value) && value.includes(':') && value.split(':').length > 2) return 'ipv6';
  return 'other';
}

function entriesOf(name: string, value: string): string[] {
  if (name === 'forwarded') {
    return value.split(',').flatMap(part => part.split(';')).map(x => x.trim()).filter(x => /^for=/i.test(x));
  }
  return value.split(',').map(x => x.trim()).filter(Boolean);
}

/** Which client-address headers reach the app, without disclosing any address. */
export function ipProbe(headers: Headers): Record<string, IpHeaderReport> {
  const report: Record<string, IpHeaderReport> = {};
  for (const name of IP_HEADERS) {
    const value = headers.get(name);
    const entries = value === null ? [] : entriesOf(name, value);
    report[name] = {present: value !== null, entries: entries.length, families: entries.map(addressFamily)};
  }
  return report;
}

/**
 * Names (not values) of `oai-*` headers that reached the app. When called
 * without signing in and with a forged `oai-authenticated-user-*` header, an
 * empty list means the platform stripped the forged header.
 */
export function headerProbe(headers: Headers): {oaiHeaderNames: string[]; identityHeadersPresent: boolean} {
  const names: string[] = [];
  headers.forEach((_value, name) => {
    const lower = name.toLowerCase();
    if (lower.startsWith('oai-') && !names.includes(lower)) names.push(lower);
  });
  names.sort();
  return {oaiHeaderNames: names, identityHeadersPresent: IDENTITY_HEADERS.every(name => headers.get(name) !== null)};
}

export const KDF_PROBE_ITERATIONS = [100000, 600000] as const;

export function parseKdfIterations(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return (KDF_PROBE_ITERATIONS as readonly number[]).includes(n) ? n : null;
}

export type KdfProbeResult =
  | {iterations: number; ok: true; derivedBytes: number; elapsedMs: number}
  | {iterations: number; ok: false; error: string};

/**
 * Derive once with a random throwaway password and salt. Nothing is stored or
 * returned except success and size. Workers may not advance timers during
 * pure CPU work, so `elapsedMs` can read 0; use the browser's response time.
 */
export async function kdfProbe(iterations: number, subtle: SubtleCrypto = crypto.subtle): Promise<KdfProbeResult> {
  if (parseKdfIterations(String(iterations)) === null) return {iterations, ok: false, error: 'unsupported iteration count'};
  const password = crypto.getRandomValues(new Uint8Array(32));
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const started = performance.now();
  try {
    const key = await subtle.importKey('raw', password, 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt, iterations}, key, 256);
    return {iterations, ok: true, derivedBytes: bits.byteLength, elapsedMs: Math.round(performance.now() - started)};
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : 'unknown error';
    return {iterations, ok: false, error: message.slice(0, 200)};
  }
}
