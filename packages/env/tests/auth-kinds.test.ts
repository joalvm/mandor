import { describe, expect, it } from 'vitest';

import { asksForToken, AUTH_KINDS, kindOf, offeredKinds } from '../src/lib/auth-kinds.js';

describe('AUTH_KINDS', () => {
    it('offers one entry per kind a level can carry, inheriting first', () => {
        expect(AUTH_KINDS.map((entry) => entry.kind)).toEqual([
            'inherit',
            'none',
            'basic',
            'bearer',
            'apikey',
            'digest',
            'awsv4',
            'oauth2-client-credentials',
            'oauth2-code-pkce',
        ]);
    });

    it('starts each kind as the level the editor writes, with its fields empty', () => {
        const starts = Object.fromEntries(
            AUTH_KINDS.map((entry) => [entry.kind, entry.start(['query', 'cookie'])]),
        );

        expect(starts).toEqual({
            inherit: undefined,
            none: { type: 'none' },
            basic: { type: 'basic', username: '', password: '' },
            bearer: { type: 'bearer', token: '' },
            apikey: { type: 'apikey', name: '', value: '', in: 'query' },
            digest: { type: 'digest', username: '', password: '' },
            awsv4: { type: 'awsv4', accessKeyId: '', secretAccessKey: '' },
            'oauth2-client-credentials': {
                type: 'oauth2-client-credentials',
                tokenUrl: '',
                clientId: '',
                clientSecret: '',
                clientAuth: 'basic',
            },
            'oauth2-code-pkce': {
                type: 'oauth2-code-pkce',
                authorizationUrl: '',
                tokenUrl: '',
                clientId: '',
            },
        });
    });

    it('puts an API key in the header when the app names no placement', () => {
        const apiKey = AUTH_KINDS.find((entry) => entry.kind === 'apikey');

        expect(apiKey?.start([])).toEqual({ type: 'apikey', name: '', value: '', in: 'header' });
    });
});

describe('offeredKinds', () => {
    const kinds = (entries: readonly { kind: string }[]) => entries.map((entry) => entry.kind);

    it('offers only the schemes the app applies, and inherit where there is a level above', () => {
        expect(kinds(offeredKinds(['none', 'bearer'], true, 'inherit'))).toEqual([
            'inherit',
            'none',
            'bearer',
        ]);
        expect(kinds(offeredKinds(['none', 'bearer'], false, 'none'))).toEqual(['none', 'bearer']);
    });

    it('still names the scheme a level carries when the app does not offer it', () => {
        expect(kinds(offeredKinds(['none'], false, 'digest'))).toEqual(['none', 'digest']);
    });
});

describe('kindOf', () => {
    it('reads an absent level and an explicit inherit the same way', () => {
        expect(kindOf(undefined)).toBe('inherit');
        expect(kindOf({ inherit: true })).toBe('inherit');
        expect(kindOf({ type: 'bearer', token: 't' })).toBe('bearer');
    });
});

describe('asksForToken', () => {
    it('is true for the OAuth2 kinds only, which ask a server for a token', () => {
        expect(
            AUTH_KINDS.filter((entry) => asksForToken(entry.kind)).map((entry) => entry.kind),
        ).toEqual(['oauth2-client-credentials', 'oauth2-code-pkce']);
    });
});
