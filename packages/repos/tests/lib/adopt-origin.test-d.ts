import type { OpenedOrigin } from '@mandor/ipc';
import { describe, expectTypeOf, it } from 'vitest';

import type { AdoptOrigin } from '../../src/lib/adopt-origin.js';

describe('what a window does with an origin main has just opened', () => {
    it('takes the id of the origin and what it holds, and finishes asynchronously', () => {
        expectTypeOf<AdoptOrigin>().toEqualTypeOf<
            (originId: string, opened: OpenedOrigin) => Promise<void>
        >();
    });
});
