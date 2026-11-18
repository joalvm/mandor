import { failure, success } from '@mandor/ipc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { fetchHistoryEntry } from '../../../../src/renderer/features/history/lib/fetch-history-entry.js';
import { entryOf, ID_A } from '../../support/history-fixture.js';

describe('reading one send of the history', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('gives the send in full', async () => {
        const read = vi.spyOn(syncBridge.history, 'read').mockResolvedValue(success(entryOf(ID_A)));

        expect(await fetchHistoryEntry('demo', ID_A)).toEqual({ entry: entryOf(ID_A), ok: true });
        expect(read).toHaveBeenCalledWith({ id: ID_A, workspaceId: 'demo' });
    });

    it('gives the code when the send is gone or cannot be read', async () => {
        vi.spyOn(syncBridge.history, 'read').mockResolvedValue(failure('fs-read', 'gone'));

        expect(await fetchHistoryEntry('demo', ID_A)).toEqual({ code: 'fs-read', ok: false });
    });
});
