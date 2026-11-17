import { describe, expectTypeOf, it } from 'vitest';

import type { CollectionPlacement } from '../../src/collection/collection-placement.js';

describe('a placement among siblings', () => {
    it('names the node and the sibling it lands above, or none for the end', () => {
        expectTypeOf<CollectionPlacement>().toEqualTypeOf<{
            name: string;
            before: string | null;
        }>();
    });
});
