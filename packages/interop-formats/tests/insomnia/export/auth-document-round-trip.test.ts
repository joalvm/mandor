import type { ConcreteAuth } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { authDocumentOf } from '../../../src/insomnia/export/auth-document.js';
import { authOf } from '../../../src/insomnia/import/auth-of.js';

describe('authDocumentOf: what the import reads back', () => {
    it.each<ConcreteAuth>([
        { type: 'none' },
        { type: 'basic', username: 'ana', password: '{{pw}}' },
        { type: 'bearer', token: '{{t}}', prefix: 'Token' },
        { type: 'apikey', name: 'X-Key', value: '{{k}}', in: 'query' },
        {
            type: 'oauth2-client-credentials',
            tokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            clientSecret: '{{secret}}',
            clientAuth: 'body',
            scope: 'read',
        },
        {
            type: 'oauth2-code-pkce',
            authorizationUrl: 'https://auth.test/authorize',
            tokenUrl: 'https://auth.test/token',
            clientId: 'abc',
            redirectPort: 9000,
        },
    ])('reads back as the same auth when the import reads what it wrote: %j', (auth) => {
        const read = authOf(authDocumentOf(auth), 'request');

        expect(read.auth).toEqual(auth);
        expect(read.degradations).toEqual([]);
    });
});
