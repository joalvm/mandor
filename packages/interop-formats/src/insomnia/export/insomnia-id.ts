import { createHash } from 'node:crypto';

/** The prefixes Insomnia gives the ids of what it exports. */
export type InsomniaIdKind = 'env' | 'fld' | 'req' | 'wrk' | 'ws-req';

/**
 * The id of a thing in the file, drawn from where it sits and not from the clock: the same
 * workspace exports the same ids, so importing it again into Insomnia updates what is there
 * instead of leaving a second copy beside it.
 */
export function insomniaIdOf(kind: InsomniaIdKind, ...path: readonly string[]): string {
    const digest = createHash('sha256').update(JSON.stringify(path), 'utf8').digest('hex');

    return `${kind}_${digest.slice(0, 32)}`;
}
