import { describe, expect, it } from 'vitest';

import {
    hasOwnScripts,
    ownScriptsOrNothing,
    type RequestScripts,
    SCRIPT_EVENTS,
    SCRIPT_LEVELS,
} from '../../src/script/own-scripts.js';

describe('the places of a script', () => {
    it('names every event, of a request and of a connection', () => {
        expect(SCRIPT_EVENTS).toEqual([
            'onBeforeRequest',
            'onResponse',
            'onBeforeConnect',
            'onConnect',
            'onMessage',
        ]);
    });

    it('names the levels of a workspace a script sits at', () => {
        expect(SCRIPT_LEVELS).toEqual(['request', 'folder', 'collection', 'connection']);
    });
});

describe('hasOwnScripts', () => {
    it('sees a script in any event, a known one or not', () => {
        expect(hasOwnScripts({ onResponse: { source: '' } })).toBe(true);
        expect(hasOwnScripts({ onFuture: { source: 'x()' } })).toBe(true);
    });

    it.each([undefined, null, {}, { onResponse: undefined }, 'text'])('sees none in %j', (map) => {
        expect(hasOwnScripts(map)).toBe(false);
    });
});

describe('ownScriptsOrNothing', () => {
    it('keeps a map with a script as it is', () => {
        const scripts = { onResponse: { source: 'a()' }, onBeforeRequest: undefined };

        expect(ownScriptsOrNothing(scripts)).toBe(scripts);
    });

    it('gives nothing for a map with no script, so the file keeps no key for it', () => {
        const unset: RequestScripts = { onResponse: undefined };

        expect(ownScriptsOrNothing({})).toBeUndefined();
        expect(ownScriptsOrNothing(unset)).toBeUndefined();
        expect(ownScriptsOrNothing<RequestScripts | undefined>(undefined)).toBeUndefined();
    });
});
