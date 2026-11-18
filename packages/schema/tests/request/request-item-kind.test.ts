import { describe, expect, it } from 'vitest';

import { REQUEST_ITEM_KIND } from '../../src/request/request-item-kind.js';

describe('REQUEST_ITEM_KIND', () => {
    it('names the kind an item of the collection of Sync carries', () => {
        expect(REQUEST_ITEM_KIND).toBe('request');
    });
});
