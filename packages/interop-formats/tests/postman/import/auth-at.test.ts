import { degradation } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { authAt } from '../../../src/postman/import/auth-at.js';
import { authConfigOf } from '../../../src/postman/import/auth-config-of.js';

function scheme(type: string, extras: Record<string, unknown>) {
    return { type, extras };
}

function oauth(extras: Record<string, unknown>) {
    return scheme('oauth2', {
        accessTokenUrl: 'https://t.test/token',
        authUrl: 'https://t.test/auth',
        clientId: 'abc',
        ...extras,
    });
}

describe('authConfigOf: what Mandor cannot hold', () => {
    it.each([
        ['request', { type: 'none' }, degradation('authNoEquivalentRequest', { type: 'digest' })],
        ['folder', { type: 'none' }, degradation('authNoEquivalentFolder', { type: 'digest' })],
        [
            'collection',
            { type: 'none' },
            degradation('authNoEquivalentCollection', { type: 'digest' }),
        ],
        ['workspace', undefined, degradation('authNoEquivalentWorkspace', { type: 'digest' })],
    ] as const)('enters a %s with no auth', (subject, auth, text) => {
        expect(authConfigOf(scheme('digest', {}), subject)).toEqual({ auth, degradations: [text] });
    });

    it('does the same for another grant, and for a scheme the schema of Mandor refuses', () => {
        expect(authConfigOf(oauth({ grant_type: 'password' }), 'request').degradations).toEqual([
            degradation('authNoEquivalentRequest', { type: 'oauth2' }),
        ]);

        const refused = authConfigOf(
            scheme('apikey', { key: 'two words', value: '{{v}}' }),
            'workspace',
        );

        expect(refused.auth).toBeUndefined();
        expect(refused.degradations[0]).toEqual(
            degradation('authRefusedWorkspace', { type: 'apikey' }),
        );
    });
});

describe('authAt', () => {
    const schemes = { s: scheme('bearer', { token: '{{t}}' }) };

    it('inherits on null, and says none on an empty list, except in the workspace and the collection, which have no such word', () => {
        expect(authAt(null, schemes, 'request')).toEqual({ auth: undefined, degradations: [] });
        expect(authAt([], schemes, 'request').auth).toEqual({ type: 'none' });
        expect(authAt([], schemes, 'workspace')).toEqual({ auth: undefined, degradations: [] });
        expect(authAt([], schemes, 'collection')).toEqual({ auth: undefined, degradations: [] });
    });

    it('reads the first scheme it names, declared or not', () => {
        expect(authAt(['s'], schemes, 'folder').auth).toEqual({ type: 'bearer', token: '{{t}}' });
        expect(authAt(['ghost'], schemes, 'folder').degradations).toEqual([
            degradation('authNoEquivalentFolder', { type: 'ghost' }),
        ]);
    });
});
