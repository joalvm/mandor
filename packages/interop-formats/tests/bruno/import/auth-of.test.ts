import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { authOf } from '../../../src/bruno/import/auth-of.js';

describe('authOf: what inherits and what stops the inheritance', () => {
    it('leaves no auth to write when the level wrote none or says inherit', () => {
        const nothing = { auth: undefined, degradations: [] };

        expect(authOf(undefined, 'request')).toEqual(nothing);
        expect(authOf({}, 'request')).toEqual(nothing);
        expect(authOf({ type: '' }, 'folder')).toEqual(nothing);
        expect(authOf({ type: 'inherit' }, 'folder')).toEqual(nothing);
    });

    it('says none for an auth that says none', () => {
        expect(authOf({ type: 'none' }, 'folder')).toEqual({
            auth: { type: 'none' },
            degradations: [],
        });
    });

    it('says none for a scheme Mandor has no word for, and says why', () => {
        expect(authOf({ type: 'digest' }, 'request')).toEqual({
            auth: { type: 'none' },
            degradations: [degradation('authNoEquivalentRequest', { type: 'digest' })],
        });
        expect(authOf({ type: 'digest' }, 'folder').degradations[0]).toEqual(
            degradation('authNoEquivalentFolder', { type: 'digest' }),
        );
    });

    it('leaves the workspace with no auth for a scheme Mandor has no word for', () => {
        expect(authOf({ type: 'digest' }, 'workspace')).toEqual({
            auth: undefined,
            degradations: [degradation('authNoEquivalentWorkspace', { type: 'digest' })],
        });
    });
});

describe('authOf: basic, bearer and api key', () => {
    it('keeps a basic auth that points at variables', () => {
        expect(
            authOf({ type: 'basic', username: 'ana', password: '{{password}}' }, 'request'),
        ).toEqual({
            auth: { type: 'basic', username: 'ana', password: '{{password}}' },
            degradations: [],
        });
    });

    it('keeps a password that was written in the collection', () => {
        const result = authOf({ type: 'basic', username: 'ana', password: 'hunter2' }, 'request');

        expect(result.auth).toEqual({ type: 'basic', username: 'ana', password: 'hunter2' });
        expect(result.degradations).toEqual([]);
    });

    it('keeps a bearer token that points at a variable', () => {
        expect(authOf({ type: 'bearer', token: '{{token}}' }, 'request')).toEqual({
            auth: { type: 'bearer', token: '{{token}}' },
            degradations: [],
        });
    });

    it('keeps a token that was written in the collection', () => {
        const result = authOf({ type: 'bearer', token: 'abc' }, 'folder');

        expect(result.auth).toEqual({ type: 'bearer', token: 'abc' });
        expect(result.degradations).toEqual([]);
    });

    it.each([
        ['header', 'header'],
        ['query', 'query'],
        [undefined, 'header'],
        ['elsewhere', 'header'],
    ])('sends an api key placed in %s in the %s', (placement, place) => {
        const result = authOf(
            { type: 'apikey', key: 'X-Api-Key', value: '{{key}}', placement },
            'request',
        );

        expect(result.auth).toEqual({
            type: 'apikey',
            name: 'X-Api-Key',
            value: '{{key}}',
            in: place,
        });
    });

    it('keeps an api key that was written in the collection', () => {
        const result = authOf({ type: 'apikey', key: 'k', value: 'abc' }, 'request');

        expect(result.auth).toMatchObject({ type: 'apikey', value: 'abc' });
        expect(result.degradations).toEqual([]);
    });

    it('enters with no auth when the key cannot be a header name', () => {
        const result = authOf({ type: 'apikey', key: 'two words', value: '{{k}}' }, 'request');

        expect(result.auth).toEqual({ type: 'none' });
        expect(result.degradations[0]).toEqual(
            degradation('authRefusedRequest', { type: 'apikey' }),
        );
    });
});
