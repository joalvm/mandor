import type { ConcreteAuth } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { authSchema } from '../../../src/bruno/document/opencollection-schema.js';
import { authOfOpenCollection } from '../../../src/bruno/document/read-oc-auth.js';
import { authDocumentOf } from '../../../src/bruno/export/auth-document.js';
import { authOf } from '../../../src/bruno/import/auth-of.js';

describe('authDocumentOf: what the import reads back', () => {
    it.each<ConcreteAuth>([
        { type: 'basic', username: 'ana', password: '{{pw}}' },
        { type: 'bearer', token: '{{t}}' },
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
    ])('reads back as the same auth when the reader reads what it wrote: %j', (auth) => {
        const document = authSchema.parse(authDocumentOf(auth));
        const read = authOf(authOfOpenCollection(document), 'request');

        expect(read.auth).toEqual(auth);
        expect(read.degradations).toEqual([]);
    });
});
