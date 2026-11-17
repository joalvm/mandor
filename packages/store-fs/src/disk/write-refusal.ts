import { NameTakenError } from '../collection/name-taken-error.js';

/** What the filesystem answers when an exclusive create finds something already at the path. */
const EXISTS = 'EEXIST';

function existing(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === EXISTS;
}

/**
 * The error a refused create has to travel as. A name that is already on disk is a thing the
 * person who typed it can fix, so it becomes the domain error the collection also raises; anything
 * else is a fault of the machine and goes up exactly as it came, with its code and its stack.
 *
 * It returns the error instead of throwing it so that the caller keeps the `throw` where the
 * reader of the caller expects one, and so that both answers can be read in a test.
 */
export function writeRefusal(error: unknown, name: string): unknown {
    return existing(error) ? new NameTakenError(name) : error;
}
