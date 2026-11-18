import { LOCAL_ORIGIN_ID, type Origin } from './origin.js';
import { originSchema } from './origin-schema.js';

export type CreateOriginInput = {
    /** The opaque id the caller minted; it names the working copy and never follows the name. */
    id: string;
    name: string;
    url?: string | undefined;
};

/**
 * Creates an origin named by the user, under the id the caller minted. An origin with a url is
 * remote; without one it is local work that was never fetched from anywhere.
 */
export function createOrigin({ id, name, url }: CreateOriginInput): Origin {
    const origin: Origin = {
        id,
        name,
        kind: url === undefined ? 'local' : 'remote',
        ...(url === undefined ? {} : { url }),
    };

    return originSchema.parse(origin);
}

/** The origin that exists from the first start. Its id is reserved and its kind is fixed. */
export function createLocalOrigin(name: string): Origin {
    return { id: LOCAL_ORIGIN_ID, name, kind: 'local' };
}
