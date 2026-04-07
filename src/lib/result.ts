/**
 * Lightweight Result type for expected domain failures (no extra dependencies).
 */

/** Successful outcome carrying a value. */
export type Ok<T> = { readonly ok: true; readonly value: T };

/** Failed outcome carrying a domain error. */
export type Err<E> = { readonly ok: false; readonly error: E };

/** Discriminated union: use `ok` / `err` helpers and branch on `ok`. */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * @param value - Success payload.
 * @returns An Ok result.
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * @param error - Domain error payload.
 * @returns An Err result.
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}
