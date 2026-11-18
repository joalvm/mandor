import { describe, expectTypeOf, it } from 'vitest';

import type { ResourceUriError } from '../../src/resource/resource-uri-error.js';
import type { ResourceUriReason } from '../../src/resource/resource-uri-reason.js';

describe('the reason a resource URI breaks', () => {
    it('names the part that broke, and no other', () => {
        expectTypeOf<ResourceUriReason>().toEqualTypeOf<
            'scheme' | 'repo' | 'workspace' | 'kind' | 'path'
        >();
    });

    it('is the reason the error carries', () => {
        expectTypeOf<ResourceUriError['reason']>().toEqualTypeOf<ResourceUriReason>();
    });
});
