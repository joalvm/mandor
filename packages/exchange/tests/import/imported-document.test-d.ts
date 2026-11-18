import { describe, expectTypeOf, it } from 'vitest';

import type { ImportedDocument } from '../../src/import/lib/imported-document.js';

describe('the imported document', () => {
    it('names the workspace written into, nothing else', () => {
        expectTypeOf<ImportedDocument>().toEqualTypeOf<{ workspaceId: string }>();
    });
});
