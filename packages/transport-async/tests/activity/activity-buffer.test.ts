import { describe, expect, it } from 'vitest';

import type { ActivityRecord } from '../../src/index.js';
import { ActivityBuffer } from '../../src/activity/activity-buffer.js';

function record(data: string): ActivityRecord {
    return { direction: 'in', data, at: 0 };
}

describe('ActivityBuffer', () => {
    it('keeps every record while under the maximum', () => {
        const buffer = new ActivityBuffer(3);

        buffer.push(record('a'));
        buffer.push(record('b'));

        expect(buffer.size).toBe(2);
    });

    it('never grows past its maximum and drops the oldest first', () => {
        const buffer = new ActivityBuffer(3);

        for (const data of ['a', 'b', 'c', 'd', 'e']) {
            buffer.push(record(data));
        }

        expect(buffer.size).toBe(3);
        expect(buffer.drain().map((entry) => entry.data)).toEqual(['c', 'd', 'e']);
    });

    it('drains every record and starts empty again', () => {
        const buffer = new ActivityBuffer(10);

        buffer.push(record('a'));

        const drained = buffer.drain();

        expect(drained).toHaveLength(1);
        expect(buffer.size).toBe(0);
    });
});
