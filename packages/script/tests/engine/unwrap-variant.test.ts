import type { QuickJSSyncVariant } from 'quickjs-emscripten-core';
import { describe, expect, it } from 'vitest';

import { unwrapVariant } from '../../src/engine/unwrap-variant.js';

const variant = { type: 'sync' } as unknown as QuickJSSyncVariant;

describe('unwrapVariant', () => {
    it('returns the variant when the loader gives it bare', () => {
        expect(unwrapVariant(variant)).toBe(variant);
    });

    it('returns the variant under a default key, which is how the CommonJS build can arrive', () => {
        expect(unwrapVariant({ default: variant })).toBe(variant);
    });
});
