import { diffEditorAt } from '@mandor/ui/testing/diff-editors-in';
import { failure, success } from '@mandor/ipc';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { syncBridge } from '../../../../src/renderer/app/sync-bridge.js';
import { HistoryDiffTab } from '../../../../src/renderer/features/history/components/diff/HistoryDiffTab.js';
import { AppProviders } from '../../support/app-providers.js';
import { entryOf, failedEntryOf, ID_A, ID_B } from '../../support/history-fixture.js';
import { httpResponseWith, textBody } from '../../support/http-response.js';

const WS = 'demo';
const OLDER = '2026-09-02T10:00:00.000Z';
const NEWER = '2026-09-02T11:00:00.000Z';

function answering(entries: Record<string, ReturnType<typeof entryOf>>): void {
    vi.spyOn(syncBridge.history, 'read').mockImplementation(({ id }) => {
        const entry = entries[id];

        return Promise.resolve(entry === undefined ? failure('fs-read', 'gone') : success(entry));
    });
}

function responseEntry(id: string, sentAt: string, status: number, text: string) {
    return entryOf(id, {
        outcome: {
            kind: 'response',
            response: httpResponseWith({ body: textBody(text), status }),
        },
        sentAt,
    });
}

beforeEach(() => {
    vi.restoreAllMocks();
});

afterEach(cleanup);

function draw(ids: readonly [string, string] = [ID_A, ID_B]): void {
    render(<HistoryDiffTab ids={ids} workspaceId={WS} />, { wrapper: AppProviders });
}

describe('the tab that compares two sends', () => {
    it('sets the answers side by side, the older send first, whichever way the ids came', async () => {
        answering({
            [ID_A]: responseEntry(ID_A, NEWER, 404, 'new'),
            [ID_B]: responseEntry(ID_B, OLDER, 200, 'old'),
        });

        draw();

        const facts = await screen.findByRole('table', { name: 'Summary' });
        const status = within(facts).getByRole('row', { name: /Status/ });
        const cells = within(status).getAllByRole('cell');

        expect(cells.map((cell) => cell.textContent)).toEqual(['200', '404']);
        expect(screen.getByRole('heading', { level: 1, name: 'Comparison' })).toBeVisible();
    });

    it('tells the facts that moved from those that did not, in words as well as in tint', async () => {
        answering({
            [ID_A]: responseEntry(ID_A, OLDER, 200, 'a'),
            [ID_B]: responseEntry(ID_B, NEWER, 404, 'a'),
        });

        draw();

        const facts = await screen.findByRole('table', { name: 'Summary' });
        const rows = within(facts).getAllByRole('row').slice(1);

        expect(rows.map((row) => row.getAttribute('data-change'))).toEqual([
            'changed',
            'same',
            'same',
            'same',
        ]);
        expect(
            within(screen.getByRole('row', { name: /Status/ })).getByText('Changed'),
        ).toBeInTheDocument();
    });

    it('sets the earlier body against the later one in the diff editor', async () => {
        answering({
            [ID_A]: responseEntry(ID_A, OLDER, 200, 'one\ntwo'),
            [ID_B]: responseEntry(ID_B, NEWER, 200, 'one\n2'),
        });

        draw();

        const editor = await diffEditorAt(0);

        expect(await screen.findByRole('group', { name: 'Body' })).toBeVisible();
        expect(editor.original()).toBe('one\ntwo');
        expect(editor.modified()).toBe('one\n2');
    });

    it('says a send is gone, once, and draws nothing else when the disk cannot give it', async () => {
        answering({ [ID_A]: responseEntry(ID_A, OLDER, 200, 'a') });

        draw();

        expect(await screen.findByText('Comparison unavailable')).toBeVisible();
        expect(await screen.findByText('Mandor could not read the requested file.')).toBeVisible();
        expect(screen.queryByRole('table')).toBeNull();
    });

    it('says there is nothing to compare when one of the sends got no answer', async () => {
        answering({
            [ID_A]: responseEntry(ID_A, OLDER, 200, 'a'),
            [ID_B]: failedEntryOf(ID_B),
        });

        draw();

        expect(await screen.findByText('Nothing to compare')).toBeVisible();
        expect(screen.queryByRole('table')).toBeNull();
    });
});
