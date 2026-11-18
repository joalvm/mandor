import { describe, expect, it } from 'vitest';

import { initialCollectionSlice } from '../src/collection.slice.js';

describe('the collection of a window before anything is read', () => {
    it('has no tree, nothing folded, nothing taken and nothing being asked', () => {
        expect(initialCollectionSlice()).toEqual({
            nodes: [],
            folded: {},
            examplesClosed: {},
            renaming: null,
            selected: [],
            deleting: null,
            error: null,
            folderSections: {},
        });
    });

    /** A window that reset would otherwise inherit what the one before it had folded and taken. */
    it('hands out a fresh slice every time, so no two windows share what they hold', () => {
        const first = initialCollectionSlice();
        const second = initialCollectionSlice();

        first.selected.push('pedidos');
        first.folded['events'] = ['pedidos'];

        expect(second.selected).toEqual([]);
        expect(second.folded).toEqual({});
        expect(first.nodes).not.toBe(second.nodes);
    });
});
