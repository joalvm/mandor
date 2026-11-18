import { describe, expect, it } from 'vitest';

import type { AuthConfig } from '@mandor/schema';

import { authHeaderLines } from '../../src/auth/auth-header-lines.js';

describe('authHeaderLines', () => {
    it('says nothing for inherit and none', () => {
        expect(authHeaderLines({ inherit: true })).toEqual([]);
        expect(authHeaderLines({ type: 'none' })).toEqual([]);
    });

    it('says the Basic pair worked out while it is written text', () => {
        const [line] = authHeaderLines({ password: 's3cret', type: 'basic', username: 'aná' });

        expect(line).toEqual({ name: 'Authorization', value: 'Basic YW7DoTpzM2NyZXQ=' });
    });

    it('says Basic is computed on send once a {{var}} stands in the pair', () => {
        const [line] = authHeaderLines({
            password: '{{pass}}',
            type: 'basic',
            username: 'ana',
        });

        expect(line).toEqual({ calculated: true, name: 'Authorization' });
    });

    it('says the Bearer header as configured, prefix included', () => {
        const [line] = authHeaderLines({ prefix: 'Bearer', token: '{{token}}', type: 'bearer' });

        expect(line).toEqual({ name: 'Authorization', value: 'Bearer {{token}}' });
    });

    it('says the header an API key rides and none for the one that travels elsewhere', () => {
        const [header] = authHeaderLines({
            in: 'header',
            name: 'X-Api-Key',
            type: 'apikey',
            value: '{{key}}',
        });

        expect(header).toEqual({ name: 'X-Api-Key', value: '{{key}}' });

        expect(authHeaderLines({ in: 'query', name: 'key', type: 'apikey', value: 'k' })).toEqual(
            [],
        );
        expect(authHeaderLines({ in: 'cookie', name: 'key', type: 'apikey', value: 'k' })).toEqual(
            [],
        );
    });

    it('says digest and aws v4 are computed on send: they sign the request itself', () => {
        expect(authHeaderLines({ type: 'digest', username: 'u', password: 'p' })).toEqual([
            { calculated: true, name: 'Authorization' },
        ]);
        expect(authHeaderLines({ type: 'awsv4', accessKeyId: 'a', secretAccessKey: 's' })).toEqual([
            { calculated: true, name: 'Authorization' },
        ]);
    });

    it('says OAuth2 is computed on send: the token lives in the session', () => {
        expect(authHeaderLines({ type: 'oauth2-client-credentials' } as AuthConfig)).toEqual([
            { calculated: true, name: 'Authorization' },
        ]);
        expect(authHeaderLines({ type: 'oauth2-code-pkce' } as AuthConfig)).toEqual([
            { calculated: true, name: 'Authorization' },
        ]);
    });
});
