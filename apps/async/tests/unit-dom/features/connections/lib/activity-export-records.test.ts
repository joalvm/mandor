import { describe, expect, it } from 'vitest';

import type { ActivityEntry } from '../../../../../src/renderer/activity/activity-entry.js';
import { activityExportRecords } from '../../../../../src/renderer/features/connections/lib/activity-export-records.js';

function frame(id: string, direction: 'in' | 'out'): ActivityEntry {
    return {
        at: 5,
        bytes: 9,
        detail: { at: 5, data: 'hola', direction, environmentId: null },
        id,
        kind: 'connection-message',
    };
}

function fault(id: string): ActivityEntry {
    return {
        at: 7,
        bytes: 0,
        detail: { at: 7, code: 'ws-open-failed' },
        id,
        kind: 'connection-fault',
    };
}

describe('the records a timeline exports as', () => {
    it('writes one line per entry, framed with its direction and its own text', () => {
        expect(activityExportRecords([frame('a', 'in')])).toEqual([
            { at: 5, bytes: 9, direction: 'in', kind: 'connection-message', text: 'hola' },
        ]);
    });

    it('writes a fault without a direction it never had', () => {
        expect(activityExportRecords([fault('b')])).toEqual([
            { at: 7, bytes: 0, kind: 'connection-fault', text: 'ws-open-failed' },
        ]);
    });
});
