import { describe, expect, it } from 'vitest';

import {
    exampleKey,
    exampleKeys,
    examplesApart,
    uniqueExampleName,
} from '../../src/request/example-keys.js';

function named(...names: string[]): { name: string }[] {
    return names.map((name) => ({ name }));
}

describe('the key an example has in the tree', () => {
    it('replaces what a path refuses with a dash', () => {
        expect(exampleKey('a/b:c')).toBe('a-b-c');
    });

    it('falls back to a word when nothing usable is left', () => {
        expect(exampleKey('  ')).toBe('example');
        expect(exampleKey('..')).toBe('example');
        expect(exampleKey('.')).toBe('example');
    });

    it('cuts a long name to what a segment holds', () => {
        expect(exampleKey('x'.repeat(400))).toHaveLength(255);
    });
});

describe('the keys of a list of examples', () => {
    it('keeps the order and numbers the repeated names', () => {
        expect(exampleKeys(named('OK', 'Fail', 'OK', 'OK'))).toEqual([
            'OK',
            'Fail',
            'OK (2)',
            'OK (3)',
        ]);
    });

    it('cuts the base, not the number, when the suffix would not fit', () => {
        const long = 'y'.repeat(300);
        const keys = exampleKeys(named(long, long));

        expect(keys[1]).toHaveLength(255);
        expect(keys[1]?.endsWith(' (2)')).toBe(true);
        expect(keys[0]).not.toBe(keys[1]);
    });
});

describe('a name for a new example', () => {
    it('is the wanted one when its key is free', () => {
        expect(uniqueExampleName(named('OK'), 'Fail')).toBe('Fail');
    });

    it('is the first free number after the wanted one when it is taken', () => {
        expect(uniqueExampleName(named('OK', 'OK (2)'), 'OK')).toBe('OK (3)');
    });

    it('sees two names that share a key as the same name', () => {
        expect(uniqueExampleName(named('a/b'), 'a:b')).toBe('a:b (2)');
    });

    it('numbers past a name that already wears the number', () => {
        expect(exampleKeys(named('OK', 'OK', 'OK (2)'))).toEqual(['OK', 'OK (2)', 'OK (2) (2)']);
    });

    it('puts the number of a repeated name in the name, and leaves the others as they are', () => {
        const first = { name: 'a/b' };

        expect(examplesApart([first, { name: 'OK' }, { name: 'OK' }])).toEqual([
            { name: 'a/b' },
            { name: 'OK' },
            { name: 'OK (2)' },
        ]);
        expect(examplesApart([first])[0]).toBe(first);
    });
});
