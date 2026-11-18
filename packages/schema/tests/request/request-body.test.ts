import { describe, expect, it } from 'vitest';

import type { RequestBody, RequestFormField } from '../../src/request/request-body.js';

describe('RequestBody', () => {
    it('takes one shape per kind, and nothing else', () => {
        const bodies: RequestBody[] = [
            { type: 'none' },
            { content: '<a/>', type: 'xml' },
            { fields: [{ enabled: true, key: 'q', value: '1' }], type: 'urlencoded' },
            { file: 'files/a.png', type: 'binary' },
            { query: '{ a }', type: 'graphql', variables: '' },
            { operationName: 'A', query: 'query A { a }', type: 'graphql', variables: '{}' },
        ];
        const field: RequestFormField = { enabled: true, key: 'cv', kind: 'file', value: 'a.png' };

        bodies.push({ fields: [field], type: 'form' });

        expect(bodies).toHaveLength(7);
    });
});
