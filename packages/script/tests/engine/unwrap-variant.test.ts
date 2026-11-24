import type { QuickJSSyncVariant } from 'quickjs-emscripten-core';
import { describe, expect, it } from 'vitest';

import { unwrapVariant } from '../../src/engine/unwrap-variant.js';

/** A variant whose build is never loaded: the test only asks which object comes back. */
const variant: QuickJSSyncVariant = {
    type: 'sync',
    importFFI: () => Promise.reject(new Error('not loaded')),
    importModuleLoader: () => Promise.reject(new Error('not loaded')),
};

describe('unwrapVariant', () => {
    it('returns the variant when the loader gives it bare', () => {
        expect(unwrapVariant(variant)).toBe(variant);
    });

    it('returns the variant under a default key, which is how the CommonJS build can arrive', () => {
        expect(unwrapVariant({ default: variant })).toBe(variant);
    });
});
