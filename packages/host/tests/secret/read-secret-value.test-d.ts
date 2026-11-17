import { describe, expectTypeOf, it } from 'vitest';

import type { ReadSecretValue } from '../../src/secret/read-secret-value.js';

describe('the way main reads a secret while it resolves', () => {
    it('takes a key and answers the value kept under it, or null', () => {
        expectTypeOf<ReadSecretValue>().toEqualTypeOf<(key: string) => Promise<string | null>>();
    });
});
