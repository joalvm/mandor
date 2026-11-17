import { describe, expect, it } from 'vitest';

import type { OriginArea } from '../../src/bridge/origin-area.js';

describe('the origin area of the bridge', () => {
    it('offers exactly the verbs the origins page acts on', () => {
        const verbs = {
            add: 1,
            check: 1,
            empty: 1,
            list: 1,
            onStateChanged: 1,
            remove: 1,
            rename: 1,
            state: 1,
            switch: 1,
        } satisfies Record<keyof OriginArea, number>;

        expect(Object.keys(verbs)).toHaveLength(9);
    });
});
