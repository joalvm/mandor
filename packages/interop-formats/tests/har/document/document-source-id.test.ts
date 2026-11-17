import { describe, expect, it } from 'vitest';

import { documentSourceId } from '../../../src/har/document/document-source-id.js';

describe('documentSourceId', () => {
    it('is the same for the same recording, so a re-import is an update', () => {
        expect(documentSourceId('{"log":{}}')).toBe(documentSourceId('{"log":{}}'));
        expect(documentSourceId('{"log":{}}')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('is another for a recording that differs by one space', () => {
        expect(documentSourceId('{"log":{}} ')).not.toBe(documentSourceId('{"log":{}}'));
    });
});
