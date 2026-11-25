import { failure, success } from '@mandor/ipc';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { HistoryDetail } from '../../../../src/renderer/features/history/components/detail/HistoryDetail.js';
import { HistoryEntryView } from '../../../../src/renderer/features/history/components/detail/HistoryEntryView.js';
import { historyStore } from '../../../../src/renderer/features/history/history-store.js';
import { AppProviders } from '../../support/app-providers.js';
import { entryOf, failedEntryOf, ID_A } from '../../support/history-fixture.js';

const WS = 'demo';
const RESOURCE = 'mandor://local/demo/history/all';

beforeEach(() => {
    vi.restoreAllMocks();
    historyStore.getState().reset();
});

afterEach(() => {
    cleanup();
    historyStore.getState().reset();
});

describe('the detail of the history', () => {
    it('asks for a pick while no send is open', () => {
        render(<HistoryDetail resource={RESOURCE} workspaceId={WS} />, { wrapper: AppProviders });

        expect(screen.getByText('No send picked')).toBeVisible();
    });

    it('draws the open send once it is read, with the views of a response', async () => {
        vi.spyOn(syncBridge.history, 'read').mockResolvedValue(success(entryOf(ID_A)));
        historyStore.getState().setOpen(WS, ID_A);

        render(<HistoryDetail resource={RESOURCE} workspaceId={WS} />, { wrapper: AppProviders });

        expect(await screen.findByText('200')).toBeVisible();
        expect(screen.getAllByRole('tab')).toHaveLength(3);
    });

    it('says the send is gone, in the detail and as a notice, when it cannot be read', async () => {
        vi.spyOn(syncBridge.history, 'read').mockResolvedValue(failure('fs-read', 'gone'));
        historyStore.getState().setOpen(WS, ID_A);

        render(<HistoryDetail resource={RESOURCE} workspaceId={WS} />, { wrapper: AppProviders });

        expect(await screen.findByText('Send not found')).toBeVisible();
        expect(await screen.findByText('Mandor could not read the requested file.')).toBeVisible();
    });
});

describe('one send in full', () => {
    function draw(entry = entryOf(ID_A)): void {
        render(<HistoryEntryView entry={entry} resource={RESOURCE} />, { wrapper: AppProviders });
    }

    it('names the request as it left', () => {
        draw();

        expect(screen.getByText('GET')).toBeVisible();
        expect(screen.getByText('http://localhost/orders')).toBeVisible();
    });

    it('shows the headers that were sent only when asked', () => {
        draw();

        expect(screen.queryByText('accept')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: /Request sent/ }));

        expect(screen.getByText('accept')).toBeVisible();
    });

    it('says why a send got no answer, in the words of its error, with no panel under it', () => {
        draw(failedEntryOf(ID_A));

        expect(screen.getByText('The server did not answer in time.')).toBeVisible();
        expect(screen.getByText('timed out')).toBeVisible();
        expect(screen.queryByRole('tab')).toBeNull();
    });

    it('reads a code of a later version as the unknown error instead of breaking', () => {
        draw(failedEntryOf(ID_A, 'request-from-the-future'));

        expect(document.querySelector('[data-part="history-entry-failure"]')).not.toBeNull();
        expect(screen.queryByRole('tab')).toBeNull();
    });
});
