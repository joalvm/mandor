import { describe, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';

import type { ActivityRecord, wsActivityPushSchema } from '../../src/index.js';

type ParsedRecord = z.output<typeof wsActivityPushSchema>['records'][number];

describe('the records of an activity push', () => {
    /**
     * `satisfies` lets the schema leave out an optional field of the type, and the parse at the
     * bridge then drops it without a word. Every field the type names has to be one it parses.
     */
    it('parse every field the record names', () => {
        expectTypeOf<keyof ParsedRecord>().toEqualTypeOf<keyof ActivityRecord>();
    });
});
