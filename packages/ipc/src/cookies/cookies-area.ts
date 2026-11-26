import type { Empty, Result } from '../result/result.js';
import type { CookiesClearRequest } from './cookies-clear.js';
import type { CookiesDeleteRequest } from './cookies-delete.js';
import type { CookieRow, CookiesListRequest } from './cookies-list.js';
import type { CookiesSetRequest } from './cookies-set.js';

/**
 * The cookie jar of an environment: what the servers set, listed, one written from its line, one
 * deleted, those of a domain or all of them. Only Sync serves it, so it sits beside its channels.
 */
export type CookiesArea = {
    /** Every cookie of the jar of the environment. */
    list: (input: CookiesListRequest) => Promise<Result<{ cookies: CookieRow[] }>>;
    /** Writes one cookie from a `Set-Cookie` line, new or in place of the one it was opened from. */
    set: (input: CookiesSetRequest) => Promise<Result<Empty>>;
    /** Deletes one cookie. */
    delete: (input: CookiesDeleteRequest) => Promise<Result<Empty>>;
    /** Empties the jar, or takes the cookies of one domain out of it. */
    clear: (input: CookiesClearRequest) => Promise<Result<Empty>>;
};
