import type { Ok } from './result.js';

/** Wraps the value of a call that crossed the operation without refusal. */
export function success<T>(value: T): Ok<T> {
    return { ok: true, value };
}
