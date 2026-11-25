import { describe, expect, it } from 'vitest';

import { initialDocsSlice } from '../src/docs.slice.js';

describe('the state of the docs at birth', () => {
    it('asks nothing, shows nothing and has listed nothing', () => {
        expect(initialDocsSlice()).toEqual({
            deleting: null,
            docs: [],
            error: null,
            folderDescriptions: {},
            listed: false,
            reading: [],
            renaming: null,
            justMade: false,
            texts: {},
            views: {},
        });
    });

    /** A reset that handed back the same lists would make two windows write into one. */
    it('gives a state of its own every time', () => {
        const first = initialDocsSlice();
        const second = initialDocsSlice();

        first.docs.push({ name: 'a.md', title: 'A' });
        first.texts['x'] = 'text';

        expect(second.docs).toEqual([]);
        expect(second.texts).toEqual({});
    });
});
