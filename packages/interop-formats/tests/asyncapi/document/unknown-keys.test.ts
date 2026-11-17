import { describe, expect, it } from 'vitest';

import { unknownKeys } from '../../../src/asyncapi/document/unknown-keys.js';

describe('unknownKeys', () => {
    it('keeps the keys nobody declared, and drops the parser notes with them', () => {
        const raw = {
            address: 'pedidos/entrantes',
            description: 'Pedidos',
            'x-zona': 'eu-oeste',
            'x-parser-unique-object-id': 'abc',
        };

        expect(unknownKeys(raw, ['address', 'description'])).toEqual({ 'x-zona': 'eu-oeste' });
    });

    it('answers an empty object when everything was known', () => {
        expect(unknownKeys({ address: 'a' }, ['address'])).toEqual({});
    });

    it('leaves the known keys untouched even when the value is strange', () => {
        expect(unknownKeys({ address: { nested: true } }, ['address'])).toEqual({});
    });
});
