import { describe, expect, it } from 'vitest';

import {
    asRecord,
    firstText,
    listAt,
    recordAt,
    textAt,
} from '../../../src/openapi/document/node-access.js';

describe('reading a node of a document someone else wrote', () => {
    it('takes a record as it is and anything else as an empty one', () => {
        const node = { a: 1 };

        expect(asRecord(node)).toBe(node);
        expect(asRecord([1])).toEqual({});
        expect(asRecord('text')).toEqual({});
        expect(asRecord(null)).toEqual({});
        expect(asRecord(undefined)).toEqual({});
    });

    it('reads a child record, or an empty one when the child is not a record', () => {
        expect(recordAt({ child: { a: 1 } }, 'child')).toEqual({ a: 1 });
        expect(recordAt({ child: 'text' }, 'child')).toEqual({});
        expect(recordAt({}, 'child')).toEqual({});
    });

    it('reads a child list, or an empty one when the child is not a list', () => {
        expect(listAt({ items: [1, 2] }, 'items')).toEqual([1, 2]);
        expect(listAt({ items: { a: 1 } }, 'items')).toEqual([]);
        expect(listAt({}, 'items')).toEqual([]);
    });

    it('reads a child text only when it is one', () => {
        expect(textAt({ name: 'pets' }, 'name')).toBe('pets');
        expect(textAt({ name: 3 }, 'name')).toBeUndefined();
        expect(textAt({}, 'name')).toBeUndefined();
    });

    it('picks the first text with something written in it', () => {
        expect(firstText(undefined, '  ', 3, 'List pets', 'listPets')).toBe('List pets');
        expect(firstText(undefined, '')).toBeUndefined();
    });
});
