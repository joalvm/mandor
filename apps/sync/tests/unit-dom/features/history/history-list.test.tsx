import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HistoryList } from '../../../../src/renderer/features/history/components/list/HistoryList.js';
import { HistoryDayGroup } from '../../../../src/renderer/features/history/components/list/HistoryDayGroup.js';
import { HistoryRow } from '../../../../src/renderer/features/history/components/row/HistoryRow.js';
import { historyStore } from '../../../../src/renderer/features/history/history-store.js';
import { selectHistoryFor } from '../../../../src/renderer/features/history/select-history-for.js';
import { AppProviders } from '../../support/app-providers.js';
import { ID_A, ID_B, ID_C, summaryOf } from '../../support/history-fixture.js';

const WS = 'demo';

beforeEach(() => {
    historyStore.getState().reset();
});

afterEach(() => {
    cleanup();
    historyStore.getState().reset();
});

function draw(): void {
    render(<HistoryList workspaceId={WS} />, { wrapper: AppProviders });
}

describe('the list of the history', () => {
    it('says nothing about being empty until the disk has answered', () => {
        draw();

        expect(screen.queryByText('Nothing sent yet')).toBeNull();
        expect(screen.getByRole('heading', { level: 1, name: 'History' })).toBeVisible();
    });

    it('says nothing was sent once the disk answered with no rows', () => {
        historyStore.getState().setSummaries(WS, []);

        draw();

        expect(screen.getByText('Nothing sent yet')).toBeVisible();
        expect(screen.queryByRole('listbox')).toBeNull();
    });

    it('draws a 200 that carried graphql errors as the failure it was', () => {
        historyStore.getState().setSummaries(WS, [
            summaryOf(ID_A, {
                outcome: {
                    bodyBytes: 40,
                    graphqlErrors: 2,
                    kind: 'response',
                    status: 200,
                    totalMs: 9,
                },
            }),
            summaryOf(ID_B),
        ]);

        draw();

        const outcomes = document.querySelectorAll('[data-part="history-outcome"]');

        expect(outcomes[0]).toHaveAttribute('data-fault', 'true');
        expect(outcomes[1]).toHaveAttribute('data-fault', 'false');
    });

    it('lists each send with its method, url, outcome and time', () => {
        historyStore.getState().setSummaries(WS, [
            summaryOf(ID_A, { url: 'http://localhost/a' }),
            summaryOf(ID_B, {
                outcome: { code: 'request-timeout', kind: 'failure' },
                url: 'http://localhost/b',
            }),
        ]);

        draw();

        expect(screen.getByRole('listbox', { name: 'Sends' })).toBeVisible();
        expect(screen.getByText('http://localhost/a')).toBeVisible();
        expect(screen.getByText('200')).toBeVisible();
        expect(screen.getByText('request-timeout')).toBeVisible();
    });

    it('groups the sends by the day they left, one group each', () => {
        historyStore
            .getState()
            .setSummaries(WS, [
                summaryOf(ID_A, { sentAt: '2026-09-02T12:00:00.000Z' }),
                summaryOf(ID_B, { sentAt: '2026-09-01T12:00:00.000Z' }),
            ]);

        draw();

        expect(screen.getAllByRole('group')).toHaveLength(2);
    });

    it('narrows to one request when the filter says so', () => {
        historyStore
            .getState()
            .setSummaries(WS, [
                summaryOf(ID_A, { itemPath: 'orders/list', url: 'http://localhost/orders' }),
                summaryOf(ID_B, { itemPath: 'users/me', url: 'http://localhost/users' }),
            ]);
        historyStore.getState().setFilter(WS, 'users/me');

        draw();

        expect(screen.queryByText('http://localhost/orders')).toBeNull();
        expect(screen.getByText('http://localhost/users')).toBeVisible();
    });
});

describe('one row of the history', () => {
    function drawRows(): void {
        const summaries = [
            summaryOf(ID_A, { url: 'http://localhost/a' }),
            summaryOf(ID_B, { url: 'http://localhost/b' }),
            summaryOf(ID_C, { url: 'http://localhost/c' }),
        ];

        historyStore.getState().setSummaries(WS, summaries);
        render(<HistoryDayGroup summaries={summaries} workspaceId={WS} />, {
            wrapper: AppProviders,
        });
    }

    it('opens the send in the detail when the row is taken', () => {
        drawRows();

        fireEvent.click(screen.getByText('http://localhost/b'));

        expect(selectHistoryFor(WS)(historyStore.getState()).openId).toBe(ID_B);
    });

    it('picks the send to compare or delete from its box, without opening it', () => {
        drawRows();

        fireEvent.click(
            screen.getByRole('checkbox', { name: 'Pick GET http://localhost/a to compare' }),
        );

        const history = selectHistoryFor(WS)(historyStore.getState());

        expect(history.selected).toEqual([ID_A]);
        expect(history.openId).toBeNull();
    });

    /** The box is no tab stop, so the keyboard reaches it through the row: Enter opens, space picks. */
    it('picks the send with space and opens it with Enter, from the row', () => {
        drawRows();

        const row = screen.getByRole('option', { name: 'http://localhost/b' });

        fireEvent.keyDown(row, { key: ' ' });

        expect(selectHistoryFor(WS)(historyStore.getState()).selected).toEqual([ID_B]);
        expect(selectHistoryFor(WS)(historyStore.getState()).openId).toBeNull();

        fireEvent.keyDown(row, { key: 'Enter' });

        expect(selectHistoryFor(WS)(historyStore.getState()).openId).toBe(ID_B);
        expect(selectHistoryFor(WS)(historyStore.getState()).selected).toEqual([ID_B]);

        fireEvent.keyDown(row, { key: ' ' });

        expect(selectHistoryFor(WS)(historyStore.getState()).selected).toEqual([]);
    });

    it('leaves the box out of the tab order, because the row is the stop', () => {
        drawRows();

        expect(
            screen.getByRole('checkbox', { name: 'Pick GET http://localhost/a to compare' }),
        ).toHaveAttribute('tabindex', '-1');
        expect(screen.getByRole('option', { name: 'http://localhost/a' })).toHaveAttribute(
            'tabindex',
            '0',
        );
    });

    it('names the box by the request it picks', () => {
        render(<HistoryRow summary={summaryOf(ID_A)} workspaceId={WS} />, {
            wrapper: AppProviders,
        });

        expect(
            screen.getByRole('checkbox', { name: 'Pick GET http://localhost/orders to compare' }),
        ).toBeVisible();
    });
});
