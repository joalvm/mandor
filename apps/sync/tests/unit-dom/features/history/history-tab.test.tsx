import { failure, success } from '@mandor/ipc';
import { allByPart, byPart } from '@mandor/ui/testing';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { HistoryTab } from '../../../../src/renderer/features/history/components/tab/HistoryTab.js';
import { historyStore } from '../../../../src/renderer/features/history/history-store.js';
import { AppProviders } from '../../support/app-providers.js';
import { ID_A, summaryOf } from '../../support/history-fixture.js';

const RESOURCE = 'mandor://local/demo/history/all';

beforeEach(() => {
    vi.restoreAllMocks();
    historyStore.getState().reset();
});

afterEach(() => {
    cleanup();
    historyStore.getState().reset();
});

function draw(): void {
    render(<HistoryTab resource={RESOURCE} workspaceId="demo" />, { wrapper: AppProviders });
}

describe('the tab of the history', () => {
    it('reads the list when it opens and shows the sends beside an empty detail', async () => {
        vi.spyOn(syncBridge.history, 'list').mockResolvedValue(
            success({ entries: [summaryOf(ID_A, { url: 'http://localhost/a' })] }),
        );

        draw();

        expect(await screen.findByText('http://localhost/a')).toBeVisible();
        expect(screen.getByText('No send picked')).toBeVisible();
    });

    it('rests the list and the detail on two cards, the gutter of the frame between them', async () => {
        draw();

        const cards = allByPart('card');

        expect(cards).toHaveLength(2);
        expect(cards[0]).toContainElement(await screen.findByText('Nothing sent yet'));
        expect(cards[1]).toContainElement(screen.getByText('No send picked'));
        expect(byPart('split-pane')).toHaveAttribute('data-gap', 'gutter');
    });

    it('says nothing was sent when the workspace has no history', async () => {
        draw();

        expect(await screen.findByText('Nothing sent yet')).toBeVisible();
    });

    it('says why in a notice when the list cannot be read', async () => {
        vi.spyOn(syncBridge.history, 'list').mockResolvedValue(failure('fs-read', 'boom'));

        draw();

        expect(await screen.findByText('Mandor could not read the requested file.')).toBeVisible();
    });
});
