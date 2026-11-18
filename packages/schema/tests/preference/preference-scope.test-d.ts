import { describe, expectTypeOf, it } from 'vitest';

import type { PreferenceScope } from '../../src/preference/preference-scope.js';

describe('the scope of a preference', () => {
    it('goes from the whole app down to one workspace, and nowhere else', () => {
        expectTypeOf<PreferenceScope>().toEqualTypeOf<'app' | 'repo' | 'workspace'>();
    });
});
