import { describe, expect, it } from 'vitest';

import { onlyLiveTarget } from '../../../../src/renderer/features/messages/lib/only-live-target.js';
import type { OutboundTarget } from '../../../../src/renderer/outbound/outbound-port.js';

function target(id: string, live: boolean): OutboundTarget {
    return { environmentId: null, id, live, name: id };
}

describe('the connection a send takes without asking', () => {
    it('is the one that is up when only one is', () => {
        const up = target('alpha', true);

        expect(onlyLiveTarget([target('beta', false), up])).toBe(up);
    });

    it('is none when several are up, or none is', () => {
        expect(onlyLiveTarget([target('alpha', true), target('beta', true)])).toBeUndefined();
        expect(onlyLiveTarget([target('alpha', false)])).toBeUndefined();
        expect(onlyLiveTarget([])).toBeUndefined();
    });
});
