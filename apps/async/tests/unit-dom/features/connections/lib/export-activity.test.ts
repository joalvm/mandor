import { describe, expect, it } from 'vitest';

import type { ActivityEntry } from '../../../../../src/renderer/activity/activity-entry.js';
import { exportActivity } from '../../../../../src/renderer/features/connections/lib/export-activity.js';
import { failure, success } from '@mandor/ipc';

const ENTRY: ActivityEntry = {
    at: 5,
    bytes: 9,
    detail: { at: 5, data: 'hola', direction: 'in', environmentId: null },
    id: 'a',
    kind: 'connection-message',
};

describe('exporting the timeline', () => {
    it('hands the records and a suggested name to the channel, and reports nothing', async () => {
        const seen: { value: { records: unknown; suggestedName: string } | null } = { value: null };

        const code = await exportActivity([ENTRY], (input) => {
            seen.value = input;

            return Promise.resolve(success({ path: '/tmp/activity.jsonl' }));
        });

        expect(code).toBeNull();
        expect(seen.value?.suggestedName).toBe('activity.jsonl');
        expect(seen.value?.records).toEqual([
            { at: 5, bytes: 9, direction: 'in', kind: 'connection-message', text: 'hola' },
        ]);
    });

    it('answers with the code of a failed write', async () => {
        const code = await exportActivity([ENTRY], () =>
            Promise.resolve(failure('fs-write', 'no room')),
        );

        expect(code).toBe('fs-write');
    });

    it('says nothing of a dialog the user closed', async () => {
        const code = await exportActivity([ENTRY], () => Promise.resolve(success({ path: null })));

        expect(code).toBeNull();
    });
});
