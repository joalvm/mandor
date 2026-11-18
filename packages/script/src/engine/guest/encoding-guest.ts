import { BASE64_GUEST } from './base64-guest.js';
import { SEARCH_PARAMS_GUEST } from './search-params-guest.js';
import { UTF8_GUEST } from './utf8-guest.js';

/**
 * `atob`, `btoa` and `URLSearchParams`, which the engine does not bring: the three pieces in the
 * order each one needs the one before. They are a subset, written to be exact where they are used.
 * The UTF-8 is written here too, not taken from `encodeURIComponent` and `decodeURIComponent` of
 * the engine: those throw on a lone surrogate and on a broken sequence, where the web puts the
 * replacement character and goes on. A script that runs in Postman must read the same here.
 * Needs `I`.
 */
export const ENCODING_GUEST = [BASE64_GUEST, UTF8_GUEST, SEARCH_PARAMS_GUEST].join('\n');
