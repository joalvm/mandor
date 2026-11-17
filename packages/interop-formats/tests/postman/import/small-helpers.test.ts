import { describe, expect, it } from 'vitest';

import { descriptionOf } from '../../../src/postman/import/description-of.js';
import { extrasOf } from '../../../src/postman/import/extras-of.js';
import { textOf } from '../../../src/postman/import/text-of.js';
import { uniqueName } from '../../../src/postman/import/unique-name.js';
import { variableOf } from '../../../src/postman/import/variable-of.js';

describe('text-of', () => {
    it.each([
        ['a', 'a'],
        [3, '3'],
        [true, 'true'],
        [null, ''],
        [undefined, ''],
        [{ a: 1 }, '{"a":1}'],
        [[1, 2], '[1,2]'],
    ])('reads %j as %j', (value, text) => {
        expect(textOf(value)).toBe(text);
    });
});

describe('description-of', () => {
    it('reads text, or the content of an object', () => {
        expect(descriptionOf('a')).toBe('a');
        expect(descriptionOf({ content: 'b' })).toBe('b');
    });

    it('reads blank, absent and null as no description', () => {
        expect(descriptionOf('  ')).toBeUndefined();
        expect(descriptionOf({ content: null })).toBeUndefined();
        expect(descriptionOf({})).toBeUndefined();
        expect(descriptionOf(null)).toBeUndefined();
        expect(descriptionOf(undefined)).toBeUndefined();
    });
});

describe('extras-of', () => {
    it('keeps what was not consumed and drops Postman bookkeeping', () => {
        const object = { name: 'a', variable: [1], _exporter_id: 'x', proxy: {} };

        expect(extrasOf(object, ['name'])).toEqual({ variable: [1], proxy: {} });
    });
});

describe('unique-name', () => {
    it('keeps a free name and counts up from two on a taken one', () => {
        const taken = new Set<string>();

        expect(uniqueName(taken, 'Users')).toBe('Users');
        expect(uniqueName(taken, 'Users')).toBe('Users (2)');
        expect(uniqueName(taken, 'Users')).toBe('Users (3)');
        expect(taken.size).toBe(3);
    });

    it('steps over a name that already carries the suffix', () => {
        const taken = new Set(['A', 'A (2)']);

        expect(uniqueName(taken, 'A')).toBe('A (3)');
    });
});

describe('variable-of', () => {
    it('keeps the name, the value as text and whether it is secret', () => {
        expect(variableOf({ key: 'a', value: 1, type: 'secret' }, false)).toEqual({
            name: 'a',
            value: '1',
            enabled: false,
            secret: true,
        });
        expect(variableOf({ key: 'b' }, true)).toEqual({
            name: 'b',
            value: '',
            enabled: true,
            secret: false,
        });
    });
});
