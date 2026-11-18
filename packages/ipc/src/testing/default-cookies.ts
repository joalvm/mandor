import type { CookiesArea } from '../cookies/cookies-area.js';
import { success } from '../result/success.js';

/**
 * The cookies area a test gets when it says nothing about the jar: it is empty, and every method
 * answers success with the smallest value its channel accepts.
 */
export function defaultCookies(): CookiesArea {
    return {
        list: () => Promise.resolve(success({ cookies: [] })),
        set: () => Promise.resolve(success({})),
        delete: () => Promise.resolve(success({})),
        clear: () => Promise.resolve(success({})),
    };
}
