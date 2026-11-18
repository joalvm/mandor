import { itemOriginSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { mandorOrigin } from '../../../src/mandor/import/mandor-origin.js';

describe('mandorOrigin', () => {
    it('names the bundle as the importer, the workspace as the source, and what it wrote', () => {
        const origin = mandorOrigin('Tienda', 'abc123');

        expect(origin).toEqual({ kind: 'mandor', sourceId: 'Tienda', fingerprint: 'abc123' });
        expect(itemOriginSchema.safeParse(origin).success).toBe(true);
    });
});
