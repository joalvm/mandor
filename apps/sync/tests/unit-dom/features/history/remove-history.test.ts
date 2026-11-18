import { failure, success } from '@mandor/ipc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { historyStore } from '../../../../src/renderer/features/history/history-store.js';
import { removeHistory } from '../../../../src/renderer/features/history/lib/remove-history.js';
import { selectHistoryFor } from '../../../../src/renderer/features/history/select-history-for.js';
import { ID_A, ID_B, summaryOf } from '../../support/history-fixture.js';

const WS = 'demo';

function listed(): string[] {
    return selectHistoryFor(WS)(historyStore.getState()).summaries.map((each) => each.id);
}

describe('deleting from the history', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        historyStore.getState().reset();
        historyStore.getState().setSummaries(WS, [summaryOf(ID_A), summaryOf(ID_B)]);
    });

    it('sends the ids to disk and takes those rows off the list once disk said yes', async () => {
        const remove = vi.spyOn(syncBridge.history, 'remove').mockResolvedValue(success({}));

        expect(await removeHistory(WS, { ids: [ID_A] })).toBeNull();

        expect(remove).toHaveBeenCalledWith({ ids: [ID_A], workspaceId: WS });
        expect(listed()).toEqual([ID_B]);
    });

    it('clears the list when everything was asked', async () => {
        const remove = vi.spyOn(syncBridge.history, 'remove').mockResolvedValue(success({}));

        expect(await removeHistory(WS, { all: true })).toBeNull();

        expect(remove).toHaveBeenCalledWith({ all: true, workspaceId: WS });
        expect(listed()).toEqual([]);
    });

    it('leaves every row where it was when the disk said no, and gives the code', async () => {
        vi.spyOn(syncBridge.history, 'remove').mockResolvedValue(failure('fs-write', 'locked'));

        expect(await removeHistory(WS, { all: true })).toBe('fs-write');
        expect(listed()).toEqual([ID_A, ID_B]);
    });
});
