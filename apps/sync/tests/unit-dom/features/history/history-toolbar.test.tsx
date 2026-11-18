import { failure, success } from '@mandor/ipc';
import { selectTabs, shellStore } from '@mandor/shell';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { HistoryDeleteDialog } from '../../../../src/renderer/features/history/components/dialog/HistoryDeleteDialog.js';
import { HistoryToolbar } from '../../../../src/renderer/features/history/components/list/HistoryToolbar.js';
import { historyStore } from '../../../../src/renderer/features/history/history-store.js';
import { selectHistoryFor } from '../../../../src/renderer/features/history/select-history-for.js';
import { AppProviders } from '../../support/app-providers.js';
import { ID_A, ID_B, summaryOf } from '../../support/history-fixture.js';

const WS = 'demo';

function listed(): string[] {
    return selectHistoryFor(WS)(historyStore.getState()).summaries.map((each) => each.id);
}

beforeEach(() => {
    vi.restoreAllMocks();
    historyStore.getState().reset();
    historyStore.getState().setSummaries(WS, [summaryOf(ID_A), summaryOf(ID_B)]);
});

afterEach(() => {
    cleanup();
    historyStore.getState().reset();
    shellStore.getState().reset();
});

function drawToolbar(): void {
    render(<HistoryToolbar workspaceId={WS} />, { wrapper: AppProviders });
}

describe('the bar of the history', () => {
    it('cannot delete the selected while none is picked', () => {
        drawToolbar();

        expect(screen.getByRole('button', { name: 'Delete selected…' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Clear history…' })).toBeEnabled();
    });

    it('compares only when exactly two sends are picked, and opens one tab for them', () => {
        drawToolbar();

        const compare = screen.getByRole('button', { name: 'Compare' });

        expect(compare).toBeDisabled();

        act(() => {
            historyStore.getState().toggleSelected(WS, ID_A);
        });

        expect(compare).toBeDisabled();

        act(() => {
            historyStore.getState().toggleSelected(WS, ID_B);
        });

        expect(compare).toBeEnabled();

        fireEvent.click(compare);

        const tabs = selectTabs(shellStore.getState()).filter((tab) => tab.kind === 'history-diff');

        expect(tabs).toHaveLength(1);
    });

    it('cannot clear a history with nothing in it', () => {
        historyStore.getState().clear(WS);

        drawToolbar();

        expect(screen.getByRole('button', { name: 'Clear history…' })).toBeDisabled();
    });

    it('asks before it deletes the picks, and keeps them when the answer is no', () => {
        historyStore.getState().toggleSelected(WS, ID_A);
        drawToolbar();

        fireEvent.click(screen.getByRole('button', { name: 'Delete selected…' }));

        expect(screen.getByRole('alertdialog')).toBeVisible();
        expect(screen.getByText('Delete the selected sends?')).toBeVisible();

        fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

        expect(listed()).toEqual([ID_A, ID_B]);
    });

    it('deletes the picks, and only them, when the answer is yes', async () => {
        const remove = vi.spyOn(syncBridge.history, 'remove').mockResolvedValue(success({}));

        historyStore.getState().toggleSelected(WS, ID_A);
        drawToolbar();

        fireEvent.click(screen.getByRole('button', { name: 'Delete selected…' }));
        fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

        await waitFor(() => {
            expect(listed()).toEqual([ID_B]);
        });
        expect(remove).toHaveBeenCalledWith({ ids: [ID_A], workspaceId: WS });
    });

    it('clears everything after the question about everything', async () => {
        const remove = vi.spyOn(syncBridge.history, 'remove').mockResolvedValue(success({}));

        drawToolbar();

        fireEvent.click(screen.getByRole('button', { name: 'Clear history…' }));
        expect(screen.getByText('Clear the history?')).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));

        await waitFor(() => {
            expect(listed()).toEqual([]);
        });
        expect(remove).toHaveBeenCalledWith({ all: true, workspaceId: WS });
    });
});

describe('the question before a delete', () => {
    it('says why in a notice, and leaves every row, when the disk refused', async () => {
        vi.spyOn(syncBridge.history, 'remove').mockResolvedValue(failure('fs-write', 'locked'));

        render(<HistoryDeleteDialog deleting="all" onClose={() => undefined} workspaceId={WS} />, {
            wrapper: AppProviders,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Clear history' }));

        expect(await screen.findByText('Mandor could not save the requested file.')).toBeVisible();
        expect(listed()).toEqual([ID_A, ID_B]);
    });

    it('asks nothing while there is nothing to ask', () => {
        render(<HistoryDeleteDialog deleting={null} onClose={() => undefined} workspaceId={WS} />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('alertdialog')).toBeNull();
    });
});
