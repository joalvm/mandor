import type { BridgeKit } from '@mandor/host/bridge-kit';
import {
    CHANNELS,
    emptyResultSchema,
    cookiesListResultSchema,
    type CookiesArea,
} from '@mandor/ipc';

/**
 * The cookie jar of an environment: list it, change a value, delete one cookie or empty it. Every
 * answer is validated at this edge; one out of contract is a bug in main, louder thrown.
 */
export function createCookiesBridge({ call }: BridgeKit): CookiesArea {
    return {
        list: (input) => call(CHANNELS.cookiesList, cookiesListResultSchema, input),
        set: (input) => call(CHANNELS.cookiesSet, emptyResultSchema, input),
        delete: (input) => call(CHANNELS.cookiesDelete, emptyResultSchema, input),
        clear: (input) => call(CHANNELS.cookiesClear, emptyResultSchema, input),
    };
}
