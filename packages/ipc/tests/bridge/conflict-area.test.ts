import { describe, expect, it } from 'vitest';

import type { ConflictArea } from '../../src/bridge/conflict-area.js';
import { createFakeBridge } from '../../src/testing/fake-bridge.js';

describe('the conflict area of the bridge (conflict-area)', () => {
    it('offers exactly the list, the reading of one clash, the two ways of closing it and the push of a change', () => {
        const verbs = { keepMine: 1, list: 1, onChanged: 1, read: 1, resolve: 1 } satisfies Record<
            keyof ConflictArea,
            number
        >;

        expect(Object.keys(verbs)).toHaveLength(5);
    });

    it('lets the double deliver the push and stop at the unsubscribe', () => {
        const bridge = createFakeBridge();
        const heard: unknown[] = [];
        const stop = bridge.conflict.onChanged((push) => heard.push(push));

        bridge.emitConflictChanged({});
        stop();
        bridge.emitConflictChanged({});

        expect(heard).toEqual([{}]);
    });
});
