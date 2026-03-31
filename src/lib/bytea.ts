/** PostgREST / Supabase `bytea` in JSON is often a hex string prefixed with `\x`. */
export function bytesToPostgresHex(bytes: Uint8Array): string {
  return (
    '\\x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  )
}

export function postgresHexToBytes(value: string): Uint8Array {
  let hex = value
  if (hex.startsWith('\\x')) hex = hex.slice(2)
  else if (hex.startsWith('0x')) hex = hex.slice(2)
  const len = hex.length / 2
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

/** Normalize values returned from Supabase for a `bytea` column. */
export function byteaFromDb(value: unknown): Uint8Array {
  if (value instanceof Uint8Array) return value
  if (value instanceof ArrayBuffer) return new Uint8Array(value)
  if (typeof value === 'string') return postgresHexToBytes(value)
  throw new Error('Unexpected bytea value from database')
}
