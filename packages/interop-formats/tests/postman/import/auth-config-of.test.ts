import { describe, expect, it } from 'vitest';

import { authConfigOf } from '../../../src/postman/import/auth-config-of.js';

function scheme(type: string, extras: Record<string, unknown>) {
    return { type, extras };
}

describe('authConfigOf: the simple schemes', () => {
    it('keeps a basic auth, and a password that points at a variable', () => {
        const result = authConfigOf(
            scheme('basic', { username: 'ana', password: '{{pw}}' }),
            'request',
        );

        expect(result).toEqual({
            auth: { type: 'basic', username: 'ana', password: '{{pw}}' },
            degradations: [],
        });
    });

    it.each([
        [
            'basic',
            { username: 'ana', password: 'hunter2' },
            { type: 'basic', username: 'ana', password: 'hunter2' },
        ],
        ['bearer', { token: 'abc' }, { type: 'bearer', token: 'abc' }],
        [
            'apikey',
            { key: 'X-Key', value: 'abc', in: 'header' },
            { type: 'apikey', name: 'X-Key', value: 'abc', in: 'header' },
        ],
    ])('keeps a %s secret written in the document', (type, extras, auth) => {
        expect(authConfigOf(scheme(type, extras), 'request')).toEqual({ auth, degradations: [] });
    });

    it('reads the bearer token, and the place of an api key: query, or else the header', () => {
        expect(authConfigOf(scheme('bearer', { token: '{{t}}' }), 'folder').auth).toEqual({
            type: 'bearer',
            token: '{{t}}',
        });
        expect(
            authConfigOf(scheme('apikey', { key: 'k', value: '{{v}}', in: 'query' }), 'request')
                .auth,
        ).toMatchObject({ in: 'query' });
        expect(
            authConfigOf(scheme('apikey', { key: 'k', value: '{{v}}' }), 'request').auth,
        ).toMatchObject({ in: 'header' });
    });
});
