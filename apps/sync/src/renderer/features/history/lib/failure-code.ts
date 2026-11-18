import { errorCodeSchema, type ErrorCode } from '@mandor/ipc';

/**
 * A stored failure keeps its code as text, because a file outlives the list of codes of the
 * version that wrote it. A code this version does not know reads as the unknown error, which
 * has words, instead of as a key that has none.
 */
export function failureCodeOf(code: string): ErrorCode {
    return errorCodeSchema.catch('unknown').parse(code);
}
