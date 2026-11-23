import type { ActivityRecord } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import type { ActivityEntry } from '../../../../src/renderer/activity/activity-entry.js';
import {
    connectionScriptContextOf,
    lastReceivedText,
} from '../../../../src/renderer/features/connections/lib/connection-script-context.js';
import { messageEntry } from '../../../../src/renderer/features/connections/lib/connection-message-entry.js';

let sequence = 0;

function entryOf(record: Omit<ActivityRecord, 'at'>): ActivityEntry {
    sequence += 1;

    return { ...messageEntry({ ...record, at: sequence }), id: String(sequence) };
}

const STATUS: ActivityEntry = {
    at: 0,
    bytes: 0,
    detail: { status: 'connected' },
    id: 'status',
    kind: 'connection-status',
};

describe('the last frame a connection received', () => {
    it('is the text of the newest frame that came in, past the ones sent and the other lines', () => {
        const entries = [
            STATUS,
            entryOf({ data: '{"old": true}', direction: 'in' }),
            entryOf({ data: '{"new": true}', direction: 'in' }),
            entryOf({ data: '{"sent": true}', direction: 'out' }),
            STATUS,
        ];

        expect(lastReceivedText(entries)).toBe('{"new": true}');
    });

    it('is none while nothing came in, or when the newest came in as bytes', () => {
        expect(lastReceivedText([])).toBeUndefined();
        expect(lastReceivedText([entryOf({ data: 'hi', direction: 'out' })])).toBeUndefined();
        expect(
            lastReceivedText([
                entryOf({ data: '{"text": true}', direction: 'in' }),
                entryOf({ binary: true, data: 'e30=', direction: 'in' }),
            ]),
        ).toBeUndefined();
    });
});

describe('the context of the scripts of a connection', () => {
    const TOKEN = { name: 'token', origin: 'environment', secret: true, value: '••••••' } as const;

    it('lists its variables as given and the handshake headers it sends', () => {
        const context = connectionScriptContextOf({
            headers: [
                { enabled: true, key: 'Authorization', value: 'Bearer x' },
                { enabled: false, key: 'X-Off', value: '1' },
            ],
            received: undefined,
            variables: [TOKEN],
        });

        expect(context).toEqual({
            headers: ['Authorization'],
            sample: undefined,
            variables: [TOKEN],
        });
    });

    it('reads the last frame it received as the sample when it is JSON', () => {
        const place = { headers: [], variables: [] };

        expect(connectionScriptContextOf({ ...place, received: '{"id": 7}' }).sample).toEqual({
            id: 7,
        });
        expect(connectionScriptContextOf({ ...place, received: 'plain' }).sample).toBeUndefined();
    });
});
