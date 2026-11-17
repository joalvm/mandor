import { describe, expect, it } from 'vitest';

import { variableMatches } from '../src/lib/variable-matches.js';

const NAMES = ['baseUrl', 'deviceType', 'device_key'];

describe('the names a query could still become', () => {
    it('offers every name while only the braces are written', () => {
        expect(variableMatches('', NAMES)).toEqual(NAMES);
    });

    it('narrows to the names the query matches', () => {
        expect(variableMatches('de', NAMES)).toEqual(['deviceType', 'device_key']);
    });

    it('matches without case', () => {
        expect(variableMatches('DEV', NAMES)).toEqual(['deviceType', 'device_key']);
    });

    it('offers nothing once the name is complete', () => {
        expect(variableMatches('baseUrl', NAMES)).toEqual([]);
    });

    it('offers nothing when nothing is being written', () => {
        expect(variableMatches(null, NAMES)).toEqual([]);
    });
});
