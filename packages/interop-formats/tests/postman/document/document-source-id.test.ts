import { describe, expect, it } from 'vitest';

import { documentSourceId } from '../../../src/postman/document/document-source-id.js';

describe('documentSourceId', () => {
    it('is the kind and the id Postman gave', () => {
        expect(documentSourceId('collection', 'abc', 'Demo')).toBe('collection:abc');
        expect(documentSourceId('environment', 'e1', 'Demo')).toBe('environment:e1');
        expect(documentSourceId('globals', 'g1', 'Demo')).toBe('globals:g1');
    });

    it('is told by the name, without case or margins, when there is no id', () => {
        const id = documentSourceId('collection', undefined, 'Demo API');

        expect(id).toMatch(/^collection:[0-9a-f]{64}$/);
        expect(documentSourceId('collection', undefined, '  demo api ')).toBe(id);
        expect(documentSourceId('collection', '', 'Demo API')).toBe(id);
        expect(documentSourceId('globals', undefined, 'Demo API')).not.toBe(id);
    });
});
