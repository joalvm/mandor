import { beforeEach, describe, expect, it } from 'vitest';

import {
    initialHistorySlice,
    NO_HISTORY,
} from '../../../../src/renderer/features/history/history.slice.js';
import {
    createHistoryStore,
    type HistoryStoreApi,
} from '../../../../src/renderer/features/history/history-store.js';
import { selectHistoryFor } from '../../../../src/renderer/features/history/select-history-for.js';
import { ID_A, ID_B, ID_C, summaryOf } from '../../support/history-fixture.js';

const WS = 'demo';

describe('the history of a workspace', () => {
    let store: HistoryStoreApi;

    beforeEach(() => {
        store = createHistoryStore();
    });

    it('starts with no workspace known', () => {
        expect(store.getState().workspaces).toEqual(initialHistorySlice().workspaces);
    });

    it('reads the same empty history, by identity, for a workspace never opened', () => {
        const select = selectHistoryFor(WS);

        expect(select(store.getState())).toBe(NO_HISTORY);
        expect(select(store.getState())).toBe(select(store.getState()));
    });

    it('marks the list loaded when the disk answered, even with nothing', () => {
        store.getState().setSummaries(WS, []);

        expect(selectHistoryFor(WS)(store.getState()).loaded).toBe(true);
    });

    it('puts a pushed send on top, and files it once however often it arrives', () => {
        store.getState().setSummaries(WS, [summaryOf(ID_A)]);
        store.getState().append(WS, summaryOf(ID_B), []);
        store.getState().append(WS, summaryOf(ID_B), []);

        const ids = selectHistoryFor(WS)(store.getState()).summaries.map((each) => each.id);

        expect(ids).toEqual([ID_B, ID_A]);
    });

    /** What the disk let go of leaves the list too, and a pick of it leaves with it. */
    it('drops, with a pushed send, the ones the limits took out of the disk', () => {
        store.getState().setSummaries(WS, [summaryOf(ID_A), summaryOf(ID_B)]);
        store.getState().toggleSelected(WS, ID_A);
        store.getState().append(WS, summaryOf(ID_C), [ID_A]);

        const history = selectHistoryFor(WS)(store.getState());

        expect(history.summaries.map((each) => each.id)).toEqual([ID_C, ID_B]);
        expect(history.selected).toEqual([]);
    });

    it('never lists a pushed send the limits took out the moment it was written', () => {
        store.getState().setSummaries(WS, [summaryOf(ID_A)]);
        store.getState().append(WS, summaryOf(ID_B), [ID_B]);

        expect(selectHistoryFor(WS)(store.getState()).summaries.map((each) => each.id)).toEqual([
            ID_A,
        ]);
    });

    it('leaves the state as it was when a push changes nothing', () => {
        store.getState().append(WS, summaryOf(ID_A), []);
        const before = store.getState();

        store.getState().append(WS, summaryOf(ID_A), []);

        expect(store.getState()).toBe(before);
    });

    it('keeps the last two picks: a third takes the place of the oldest', () => {
        store.getState().toggleSelected(WS, ID_A);
        store.getState().toggleSelected(WS, ID_B);
        store.getState().toggleSelected(WS, ID_C);

        expect(selectHistoryFor(WS)(store.getState()).selected).toEqual([ID_B, ID_C]);
    });

    it('drops a pick when it is toggled again', () => {
        store.getState().toggleSelected(WS, ID_A);
        store.getState().toggleSelected(WS, ID_A);

        expect(selectHistoryFor(WS)(store.getState()).selected).toEqual([]);
    });

    it('lets the open send and the picks leave with the rows that were deleted', () => {
        store.getState().setSummaries(WS, [summaryOf(ID_A), summaryOf(ID_B)]);
        store.getState().setOpen(WS, ID_A);
        store.getState().toggleSelected(WS, ID_A);
        store.getState().toggleSelected(WS, ID_B);

        store.getState().removeIds(WS, [ID_A]);

        const history = selectHistoryFor(WS)(store.getState());

        expect(history.summaries.map((each) => each.id)).toEqual([ID_B]);
        expect(history.openId).toBeNull();
        expect(history.selected).toEqual([ID_B]);
    });

    it('keeps the open send while it is still in the list', () => {
        store.getState().setSummaries(WS, [summaryOf(ID_A), summaryOf(ID_B)]);
        store.getState().setOpen(WS, ID_B);

        store.getState().removeIds(WS, [ID_A]);

        expect(selectHistoryFor(WS)(store.getState()).openId).toBe(ID_B);
    });

    it('empties the list and the picks when everything is cleared, and stays loaded', () => {
        store.getState().setSummaries(WS, [summaryOf(ID_A)]);
        store.getState().toggleSelected(WS, ID_A);
        store.getState().setOpen(WS, ID_A);

        store.getState().clear(WS);

        expect(selectHistoryFor(WS)(store.getState())).toMatchObject({
            loaded: true,
            openId: null,
            selected: [],
            summaries: [],
        });
    });

    it('narrows to one request and back to all of them', () => {
        store.getState().setFilter(WS, 'orders/list');
        expect(selectHistoryFor(WS)(store.getState()).filterItemPath).toBe('orders/list');

        store.getState().setFilter(WS, null);
        expect(selectHistoryFor(WS)(store.getState()).filterItemPath).toBeNull();
    });

    it('keeps each workspace apart', () => {
        store.getState().append('one', summaryOf(ID_A), []);

        expect(selectHistoryFor('two')(store.getState())).toBe(NO_HISTORY);
    });

    it('forgets everything on reset, and the actions still work after', () => {
        store.getState().append(WS, summaryOf(ID_A), []);

        store.getState().reset();
        store.getState().append(WS, summaryOf(ID_B), []);

        expect(selectHistoryFor(WS)(store.getState()).summaries.map((each) => each.id)).toEqual([
            ID_B,
        ]);
    });
});
