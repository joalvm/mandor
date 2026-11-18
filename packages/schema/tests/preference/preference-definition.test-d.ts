import { describe, expectTypeOf, it } from 'vitest';

import type { PreferenceDefinition } from '../../src/preference/preference-definition.js';
import type { PreferenceScope } from '../../src/preference/preference-scope.js';

describe('the shape of a preference definition', () => {
    it('is a select with a default, the keys of its texts and the values it can take', () => {
        expectTypeOf<PreferenceDefinition>().toEqualTypeOf<{
            defaultValue: string;
            helpKey: string;
            key: string;
            labelKey: string;
            scope: PreferenceScope;
            section: string;
            type: 'select';
            values: readonly string[];
        }>();
    });

    it('keeps the scope as the level it is kept at', () => {
        expectTypeOf<PreferenceDefinition['scope']>().toEqualTypeOf<PreferenceScope>();
    });
});
