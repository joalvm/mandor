import type { Empty, Result } from '../result/result.js';
import type { CookiesClearRequest } from './cookies-clear.js';
import type { CookiesDeleteRequest } from './cookies-delete.js';
import type { CookieRow, CookiesListRequest } from './cookies-list.js';
import type { CookiesSetRequest } from './cookies-set.js';

/**
 * The cookie jar of an environment: what the servers set, listed, a value changed, one deleted or
 * all of them. Only Sync serves it, so it sits beside its channels.
 */
export type CookiesArea = {
    /** Every cookie of the jar of the environment. */
    list: (input: CookiesListRequest) => Promise<Result<{ cookies: CookieRow[] }>>;
    /** Changes the value of a cookie the jar holds. */
    set: (input: CookiesSetRequest) => Promise<Result<Empty>>;
    /** Deletes one cookie. */
    delete: (input: CookiesDeleteRequest) => Promise<Result<Empty>>;
    /** Empties the jar. */
    clear: (input: CookiesClearRequest) => Promise<Result<Empty>>;
};
