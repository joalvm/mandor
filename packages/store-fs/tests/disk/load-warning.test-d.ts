import { describe, expectTypeOf, it } from 'vitest';

import type { LoadWarning } from '../../src/disk/load-warning.js';

describe('a load warning', () => {
    it('carries the path and the message, and the name only when the text got that far', () => {
        expectTypeOf<LoadWarning['path']>().toEqualTypeOf<string>();
        expectTypeOf<LoadWarning['message']>().toEqualTypeOf<string>();
        expectTypeOf<LoadWarning['name']>().toEqualTypeOf<string | undefined>();
    });
});
