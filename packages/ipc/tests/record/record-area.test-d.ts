import { describe, expectTypeOf, it } from 'vitest';

import type { RecordArea } from '../../src/index.js';
import type { RecordStartRequest } from '../../src/record/record-start.js';
import type { RecordStatePush } from '../../src/record/record-state.js';

describe('the record area of the bridge contract', () => {
    it('starts from the request its channel validates', () => {
        expectTypeOf<RecordArea['start']>().parameter(0).toEqualTypeOf<RecordStartRequest>();
    });

    it('delivers the state main pushes as the file grows', () => {
        expectTypeOf<RecordArea['onState']>()
            .parameter(0)
            .toEqualTypeOf<(push: RecordStatePush) => void>();
    });
});
