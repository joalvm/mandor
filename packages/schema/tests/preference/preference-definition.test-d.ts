import { describe, expectTypeOf, it } from 'vitest';

import type {
    ChoicePreference,
    PreferenceDefinition,
    TextPreference,
} from '../../src/preference/preference-definition.js';
import type { PreferenceScope } from '../../src/preference/preference-scope.js';

describe('the shape of a preference definition', () => {
    it('is a choice from a list or a text written by hand', () => {
        expectTypeOf<PreferenceDefinition>().toEqualTypeOf<ChoicePreference | TextPreference>();
    });

    it('takes a choice as a select or a switch, its options read by name or as an amount', () => {
        expectTypeOf<ChoicePreference['type']>().toEqualTypeOf<'select' | 'switch'>();
        expectTypeOf<ChoicePreference['values']>().toEqualTypeOf<readonly string[]>();
        expectTypeOf<ChoicePreference['unitKey']>().toEqualTypeOf<string | undefined>();
    });

    it('bounds a text by its length', () => {
        expectTypeOf<TextPreference['type']>().toEqualTypeOf<'text'>();
        expectTypeOf<TextPreference['maxLength']>().toEqualTypeOf<number>();
    });

    it('keeps the scope as the level it is kept at', () => {
        expectTypeOf<PreferenceDefinition['scope']>().toEqualTypeOf<PreferenceScope>();
    });
});
