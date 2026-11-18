import { describe, expect, it } from 'vitest';

import { dynamicUuid } from '../../src/dynamic/dynamic-uuid.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('the uuid of a dynamic variable', () => {
    it('answers a version 4 uuid', () => {
        expect(dynamicUuid()).toMatch(UUID_V4);
    });

    it('answers a different one every time', () => {
        expect(dynamicUuid()).not.toBe(dynamicUuid());
    });
});
