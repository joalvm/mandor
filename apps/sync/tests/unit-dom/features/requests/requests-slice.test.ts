import { describe, expect, it } from 'vitest';

import { initialRequestsSlice } from '../../../../src/renderer/features/requests/requests.slice.js';

describe('initialRequestsSlice', () => {
    it('starts with an empty shelf and nothing in flight', () => {
        expect(initialRequestsSlice()).toEqual({ pendings: {}, reading: [], requests: {} });
    });
});
