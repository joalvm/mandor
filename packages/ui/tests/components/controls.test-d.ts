import type { ComponentProps } from 'react';
import type { IconName } from '@mandor/icons';
import { describe, expectTypeOf, it } from 'vitest';

import type { IconButton, Select } from '../../src/index.js';

describe('the control primitives', () => {
    it('requires an IconButton label in its public type', () => {
        type Props = ComponentProps<typeof IconButton>;

        expectTypeOf<Props>().toExtend<{ icon: IconName; label: string }>();
    });

    it('hands a Select caller the type of the values of its options, and takes no other text', () => {
        type Props = ComponentProps<typeof Select<'beta' | 'stable'>>;

        expectTypeOf<Props['onValueChange']>().parameter(0).toEqualTypeOf<'beta' | 'stable'>();
        expectTypeOf<'nightly'>().not.toExtend<NonNullable<Props['value']>>();
    });
});
