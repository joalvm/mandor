import { describe, expect, it } from 'vitest';

import { schemaOfDraft } from '../../src/schema-generation/schema-of-draft.js';

describe('the schema a composer draft generates', () => {
    it('is read off the draft, or nothing when it cannot parse it', () => {
        expect(schemaOfDraft('{"id": 1}')).toContain('"type": "number"');
        expect(schemaOfDraft('{"id": {{pedidoId}}}')).toBeNull();
    });
});
