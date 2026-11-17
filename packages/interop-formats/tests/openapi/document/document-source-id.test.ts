import { describe, expect, it } from 'vitest';

import { documentSourceId } from '../../../src/openapi/document/document-source-id.js';

describe('the identity of an OpenAPI document', () => {
    it('is the title, so a new release of the same API is an update and not a duplicate', () => {
        expect(documentSourceId('Petstore')).toBe(documentSourceId('  petstore '));
    });

    it('tells two APIs apart', () => {
        expect(documentSourceId('Petstore')).not.toBe(documentSourceId('Shop'));
    });

    it('is a sha256 in hex', () => {
        expect(documentSourceId('Petstore')).toMatch(/^[0-9a-f]{64}$/u);
    });
});
