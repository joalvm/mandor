import { describe, expect, it } from 'vitest';

import {
    containerMark,
    entriesOf,
    jsonLines,
    openAfter,
    parsedJson,
    scalarKindOf,
    scalarText,
} from '../../../src/renderer/response/lib/json-tree.js';

describe('json-tree', () => {
    it('parses a JSON text and answers undefined for one that is not', () => {
        expect(parsedJson('{"a":1}')).toEqual({ value: { a: 1 } });
        expect(parsedJson('null')).toEqual({ value: null });
        expect(parsedJson('{oops')).toBeUndefined();
    });

    it('opens an object by its names, an array by its indices, and a scalar into nothing', () => {
        expect(entriesOf({ a: 1, b: [2] })).toEqual([
            { key: 'a', value: 1 },
            { key: 'b', value: [2] },
        ]);
        expect(entriesOf(['x'])).toEqual([{ key: '0', value: 'x' }]);
        expect(entriesOf('x')).toBeNull();
        expect(entriesOf(null)).toBeNull();
    });

    it('sums a container up by its brackets and how many it holds', () => {
        expect(containerMark([1, 2, 3])).toBe('[3]');
        expect(containerMark({ a: 1 })).toBe('{1}');
    });

    it('tells what a scalar is and how it reads', () => {
        expect(scalarKindOf(true)).toBe('boolean');
        expect(scalarKindOf(4)).toBe('number');
        expect(scalarKindOf('t')).toBe('string');
        expect(scalarKindOf(null)).toBe('null');
        expect(scalarText('text')).toBe('text');
        expect(scalarText(4)).toBe('4');
        expect(scalarText(null)).toBe('null');
    });

    it('walks only the lines that are open, each a step deeper than its own', () => {
        const document = { a: { b: [1] }, c: 2 };

        expect(jsonLines(document, new Set()).map(({ id, level }) => [id, level])).toEqual([
            ['/a', 1],
            ['/c', 1],
        ]);
        expect(
            jsonLines(document, new Set(['/a', '/a/b'])).map(({ expanded, id, level }) => [
                id,
                level,
                expanded,
            ]),
        ).toEqual([
            ['/a', 1, true],
            ['/a/b', 2, true],
            ['/a/b/0', 3, undefined],
            ['/c', 1, undefined],
        ]);
    });

    it('keeps apart a name that holds a slash from two names', () => {
        const ids = jsonLines({ 'a/b': 1, a: { b: 2 } }, new Set(['/a'])).map(({ id }) => id);

        expect(ids).toEqual(['/a~1b', '/a', '/a/b']);
    });

    it('opens and folds one line, leaving the rest as they were', () => {
        const open = new Set(['/a']);

        expect([...openAfter(open, '/b', true)]).toEqual(['/a', '/b']);
        expect([...openAfter(open, '/a', false)]).toEqual([]);
        expect([...open]).toEqual(['/a']);
    });
});
