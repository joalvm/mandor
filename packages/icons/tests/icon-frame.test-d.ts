import { describe, expectTypeOf, it } from 'vitest';

import type { IconAppearanceProps } from '../src/icon-appearance.js';

describe('the icon frame', () => {
    it('offers appearance only: no weight, no stroke width, no handlers', () => {
        type HasWeight = 'weight' extends keyof IconAppearanceProps ? true : false;
        type HasStrokeWidth = 'strokeWidth' extends keyof IconAppearanceProps ? true : false;
        type HasChildren = 'children' extends keyof IconAppearanceProps ? true : false;

        expectTypeOf<HasWeight>().toEqualTypeOf<false>();
        expectTypeOf<HasStrokeWidth>().toEqualTypeOf<false>();
        expectTypeOf<HasChildren>().toEqualTypeOf<false>();
    });
});
