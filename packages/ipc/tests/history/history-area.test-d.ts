import { describe, expectTypeOf, it } from 'vitest';

import type { HistoryArea } from '../../src/index.js';
import type { HistoryDeleteRequest } from '../../src/history/history-delete.js';
import type { HistoryListRequest } from '../../src/history/history-list.js';
import type { HistoryReadRequest } from '../../src/history/history-read.js';

describe('the history area of the bridge contract', () => {
    it('lists by the request its channel validates', () => {
        expectTypeOf<HistoryArea['list']>().parameter(0).toEqualTypeOf<HistoryListRequest>();
    });

    it('reads by the request its channel validates', () => {
        expectTypeOf<HistoryArea['read']>().parameter(0).toEqualTypeOf<HistoryReadRequest>();
    });

    it('removes by the request its channel validates', () => {
        expectTypeOf<HistoryArea['remove']>().parameter(0).toEqualTypeOf<HistoryDeleteRequest>();
    });
});
