import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { authOf } from '../../../src/insomnia/import/auth-of.js';

describe('authOf: what inherits and what stops the inheritance', () => {
    it('leaves no auth to write when the document wrote none', () => {
        expect(authOf(undefined, 'request')).toEqual({ auth: undefined, degradations: [] });
        expect(authOf({}, 'request')).toEqual({ auth: undefined, degradations: [] });
        expect(authOf({ type: '' }, 'folder')).toEqual({ auth: undefined, degradations: [] });
    });

    it('says none for an auth that is switched off or that says none', () => {
        expect(authOf({ type: 'bearer', token: 'x', disabled: true }, 'request').auth).toEqual({
            type: 'none',
        });
        expect(authOf({ type: 'none' }, 'folder')).toEqual({
            auth: { type: 'none' },
            degradations: [],
        });
    });
});

describe('authOf: basic, bearer and api key', () => {
    it('keeps a basic auth that points at variables', () => {
        expect(
            authOf({ type: 'basic', username: 'ana', password: '{{ _.password }}' }, 'request'),
        ).toEqual({
            auth: { type: 'basic', username: 'ana', password: '{{ _.password }}' },
            degradations: [],
        });
    });

    it('keeps a password that was written in the collection', () => {
        const result = authOf({ type: 'basic', username: 'ana', password: 'hunter2' }, 'request');

        expect(result.auth).toEqual({ type: 'basic', username: 'ana', password: 'hunter2' });
        expect(result.degradations).toEqual([]);
    });

    it('keeps a bearer token with its prefix when it has one', () => {
        expect(
            authOf({ type: 'bearer', token: '{{ _.t }}', prefix: 'Token' }, 'request').auth,
        ).toEqual({
            type: 'bearer',
            token: '{{ _.t }}',
            prefix: 'Token',
        });
        expect(authOf({ type: 'bearer', token: '{{ _.t }}' }, 'request').auth).toEqual({
            type: 'bearer',
            token: '{{ _.t }}',
        });
    });

    it('keeps a token that was written in the collection', () => {
        const result = authOf({ type: 'bearer', token: 'abc' }, 'folder');

        expect(result.auth).toEqual({ type: 'bearer', token: 'abc' });
        expect(result.degradations).toEqual([]);
    });

    it.each([
        ['header', 'header'],
        ['queryParams', 'query'],
        [undefined, 'header'],
        ['elsewhere', 'header'],
    ])('sends an api key added to %s in the %s', (addTo, place) => {
        const result = authOf(
            { type: 'apikey', key: 'X-Api-Key', value: '{{ _.key }}', addTo },
            'request',
        );

        expect(result.auth).toEqual({
            type: 'apikey',
            name: 'X-Api-Key',
            value: '{{ _.key }}',
            in: place,
        });
    });

    it('keeps an api key that was written in the collection', () => {
        const result = authOf({ type: 'apikey', key: 'k', value: 'abc' }, 'request');

        expect(result.auth).toMatchObject({ type: 'apikey', value: 'abc' });
        expect(result.degradations).toEqual([]);
    });

    it('enters with no auth when the key cannot be a header name', () => {
        const result = authOf({ type: 'apikey', key: 'two words', value: '{{ _.k }}' }, 'request');

        expect(result.auth).toEqual({ type: 'none' });
        expect(result.degradations[0]).toEqual(
            degradation('authRefusedRequest', { type: 'apikey' }),
        );
    });

    it('takes an api key that travels in a cookie', () => {
        const { auth } = authOf(
            { type: 'apikey', key: 'sid', value: '{{k}}', addTo: 'cookie' },
            'request',
        );

        expect(auth).toMatchObject({ type: 'apikey', name: 'sid', in: 'cookie' });
    });
});
