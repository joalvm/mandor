import { failure, success } from '@mandor/ipc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { historyStore } from '../../../../src/renderer/features/history/history-store.js';
import { loadHistory } from '../../../../src/renderer/features/history/lib/load-history.js';
import { selectHistoryFor } from '../../../../src/renderer/features/history/select-history-for.js';
import { ID_A, ID_B, summaryOf } from '../../support/history-fixture.js';

const WS = 'demo';

function listed(): string[] {
    return selectHistoryFor(WS)(historyStore.getState()).summaries.map((each) => each.id);
}

describe('loading the history', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        historyStore.getState().reset();
    });

    it('files the rows the disk lists and marks the workspace loaded', async () => {
        vi.spyOn(syncBridge.history, 'list').mockResolvedValue(
            success({ entries: [summaryOf(ID_A)] }),
        );

        expect(await loadHistory(WS)).toBeNull();

        expect(listed()).toEqual([ID_A]);
        expect(selectHistoryFor(WS)(historyStore.getState()).loaded).toBe(true);
    });

    it('asks the disk once: opening the tab again is a draw', async () => {
        const list = vi
            .spyOn(syncBridge.history, 'list')
            .mockResolvedValue(success({ entries: [] }));

        await loadHistory(WS);
        await loadHistory(WS);

        expect(list).toHaveBeenCalledOnce();
    });

    it('lets a second tab wait for the read of the first', async () => {
        const list = vi
            .spyOn(syncBridge.history, 'list')
            .mockResolvedValue(success({ entries: [] }));

        await Promise.all([loadHistory(WS), loadHistory(WS)]);

        expect(list).toHaveBeenCalledOnce();
    });

    it('keeps a send that was pushed while the read was on its way, on top of it', async () => {
        vi.spyOn(syncBridge.history, 'list').mockImplementation(() => {
            historyStore.getState().append(WS, summaryOf(ID_B), []);

            return Promise.resolve(success({ entries: [summaryOf(ID_A)] }));
        });

        await loadHistory(WS);

        expect(listed()).toEqual([ID_B, ID_A]);
    });

    it('does not double a pushed send the read also listed', async () => {
        vi.spyOn(syncBridge.history, 'list').mockImplementation(() => {
            historyStore.getState().append(WS, summaryOf(ID_A), []);

            return Promise.resolve(success({ entries: [summaryOf(ID_A)] }));
        });

        await loadHistory(WS);

        expect(listed()).toEqual([ID_A]);
    });

    it('says the code of a read that failed, stays unloaded and may try again', async () => {
        const list = vi
            .spyOn(syncBridge.history, 'list')
            .mockResolvedValueOnce(failure('fs-read', 'boom'))
            .mockResolvedValueOnce(success({ entries: [] }));

        expect(await loadHistory(WS)).toBe('fs-read');
        expect(selectHistoryFor(WS)(historyStore.getState()).loaded).toBe(false);

        expect(await loadHistory(WS)).toBeNull();
        expect(list).toHaveBeenCalledTimes(2);
    });
});
