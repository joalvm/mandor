import { describe, expect, it } from 'vitest';

import { documentSourceId } from '../../../src/asyncapi/document/document-source-id.js';

describe('documentSourceId', () => {
    it('answers the same identity for the same text', () => {
        expect(documentSourceId('asyncapi: 2.6.0')).toBe(documentSourceId('asyncapi: 2.6.0'));
    });

    it('answers a different identity when the document changed', () => {
        expect(documentSourceId('asyncapi: 2.6.0')).not.toBe(documentSourceId('asyncapi: 2.6.1'));
    });
});
