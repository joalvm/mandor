import { describe, expect, it } from 'vitest';

import { headerMatches } from '../src/lib/header-matches.js';
import { KEY_HEADER_NAMES } from '../src/lib/header-names.js';

describe('the names the key cell suggests', () => {
    it('names each header once, spelled the way the wire spells it', () => {
        const seen = new Set(KEY_HEADER_NAMES);

        expect(KEY_HEADER_NAMES.length).toBeGreaterThan(40);
        expect(seen.size).toBe(KEY_HEADER_NAMES.length);

        for (const name of KEY_HEADER_NAMES) {
            expect(name).toMatch(/^[A-Za-z][A-Za-z0-9-]*$/);
        }
    });

    it('an empty query fits every name, in the order they were given', () => {
        expect(headerMatches('   ', KEY_HEADER_NAMES)).toEqual(KEY_HEADER_NAMES);
    });

    it('the names that start with the query come first, then the ones that carry it', () => {
        const names = ['Accept', 'User-Agent', 'Cache-Control', 'Accept-Language'];

        expect(headerMatches('acc', names)).toEqual(['Accept', 'Accept-Language']);
        expect(headerMatches('AGE', names)).toEqual(['User-Agent', 'Accept-Language']);
    });

    it('a query nothing starts still answers with the names that carry it', () => {
        const names = ['Accept', 'Content-Type', 'Authorization'];

        expect(headerMatches('ty', names)).toEqual(['Content-Type']);
        expect(headerMatches('zzz', names)).toEqual([]);
    });
});
