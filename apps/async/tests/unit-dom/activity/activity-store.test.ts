import { ACTIVITY_WINDOW_BYTES } from '@mandor/ipc';
import { afterEach, describe, expect, it } from 'vitest';

import type { NewActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import {
    ACTIVITY_KEPT_AT_FIRST,
    activityKept,
} from '../../../src/renderer/activity/activity-kept.js';
import { createActivityStore } from '../../../src/renderer/activity/activity-store.js';
import { selectNarrowingFor } from '../../../src/renderer/activity/select-narrowing-for.js';
import { selectActivityFor } from '../../../src/renderer/activity/select-activity-for.js';

const ALPHA = 'mandor://demo/payments/connection/alpha';
const BETA = 'mandor://demo/payments/connection/beta';

function entry(index: number, bytes = 8): NewActivityEntry {
    return { at: index, bytes, detail: { at: index, code: 'unknown' }, kind: 'connection-fault' };
}

function batch(size: number, from = 0, bytes = 8): NewActivityEntry[] {
    return Array.from({ length: size }, (_, offset) => entry(from + offset, bytes));
}

afterEach(() => {
    activityKept.setState(activityKept.getInitialState());
});

describe('the activity buffer', () => {
    /** Two resources are two timelines: what one socket says never shows up under another. */
    it('keeps the buffer of each resource apart', () => {
        const store = createActivityStore();

        store.getState().appendActivity(ALPHA, batch(2));
        store.getState().appendActivity(BETA, batch(1, 100));

        expect(selectActivityFor(ALPHA)(store.getState())).toHaveLength(2);
        expect(selectActivityFor(BETA)(store.getState())).toHaveLength(1);
    });

    /** Two identical frames are two rows, so the list needs a name the buffer gives out. */
    it('names every entry it takes in', () => {
        const store = createActivityStore();

        store.getState().appendActivity(ALPHA, [entry(1), entry(1)]);

        const ids = selectActivityFor(ALPHA)(store.getState()).map((each) => each.id);

        expect(new Set(ids).size).toBe(2);
    });

    it('keeps what it was handed beside the name it gave', () => {
        const store = createActivityStore();

        store.getState().appendActivity(ALPHA, [entry(7)]);

        expect(selectActivityFor(ALPHA)(store.getState())[0]).toMatchObject({
            at: 7,
            bytes: 8,
            detail: { at: 7, code: 'unknown' },
            kind: 'connection-fault',
        });
    });

    /** The cap is what keeps a busy socket from growing renderer memory without bound. */
    it('drops the oldest entries when a batch overflows the entry cap', () => {
        const store = createActivityStore();

        store.getState().appendActivity(ALPHA, batch(ACTIVITY_KEPT_AT_FIRST + 10));

        const entries = selectActivityFor(ALPHA)(store.getState());

        expect(entries).toHaveLength(ACTIVITY_KEPT_AT_FIRST);
        expect(entries[0]).toMatchObject({ at: 10 });
    });

    it('keeps as many entries as the person chose to keep', () => {
        const store = createActivityStore();

        activityKept.setState({ entries: 1000 });
        store.getState().appendActivity(ALPHA, batch(1010));

        expect(selectActivityFor(ALPHA)(store.getState())).toHaveLength(1000);
    });

    /** A lower setting is felt at once, not at the next frame of each connection. */
    it('drops at once what is past a lower count, and leaves a timeline within it as it was', () => {
        const store = createActivityStore();

        store.getState().appendActivity(ALPHA, batch(300));
        store.getState().appendActivity(BETA, batch(100, 1000));

        const beta = selectActivityFor(BETA)(store.getState());

        activityKept.setState({ entries: 200 });
        store.getState().trimActivity();

        expect(selectActivityFor(ALPHA)(store.getState())).toHaveLength(200);
        expect(selectActivityFor(ALPHA)(store.getState())[0]).toMatchObject({ at: 100 });
        expect(selectActivityFor(BETA)(store.getState())).toBe(beta);
    });

    /** A talkative server sends few frames and many bytes: the second cap is what holds it. */
    it('drops the oldest entries when the buffer outgrows the byte cap', () => {
        const store = createActivityStore();
        const heavy = ACTIVITY_WINDOW_BYTES / 4;

        store.getState().appendActivity(ALPHA, batch(6, 0, heavy));

        const entries = selectActivityFor(ALPHA)(store.getState());
        const held = entries.reduce((total, each) => total + each.bytes, 0);

        expect(held).toBeLessThanOrEqual(ACTIVITY_WINDOW_BYTES);
        expect(entries[entries.length - 1]).toMatchObject({ at: 5 });
    });

    /** One entry over the whole cap is still shown: dropping it would hide what arrived. */
    it('keeps the newest entry even when it is larger than the byte cap', () => {
        const store = createActivityStore();

        store.getState().appendActivity(ALPHA, [entry(1, ACTIVITY_WINDOW_BYTES * 2)]);

        expect(selectActivityFor(ALPHA)(store.getState())).toHaveLength(1);
    });

    it('frees the buffer of one resource and leaves the rest alone', () => {
        const store = createActivityStore();

        store.getState().appendActivity(ALPHA, batch(2));
        store.getState().appendActivity(BETA, batch(2));
        store.getState().clearActivity(ALPHA);

        expect(selectActivityFor(ALPHA)(store.getState())).toEqual([]);
        expect(selectActivityFor(BETA)(store.getState())).toHaveLength(2);
    });

    it('empties every buffer when the window changes what it is looking at', () => {
        const store = createActivityStore();

        store.getState().appendActivity(ALPHA, batch(2));
        store.getState().reset();

        expect(selectActivityFor(ALPHA)(store.getState())).toEqual([]);
    });

    /** A stable empty reference: a quiet resource must not redraw the panel on every batch. */
    it('answers with the same empty buffer for every resource that has none', () => {
        const store = createActivityStore();

        expect(selectActivityFor(ALPHA)(store.getState())).toBe(
            selectActivityFor(BETA)(store.getState()),
        );
    });

    it('ignores an empty batch instead of touching the buffer', () => {
        const store = createActivityStore();

        store.getState().appendActivity(ALPHA, batch(2));

        const before = selectActivityFor(ALPHA)(store.getState());

        store.getState().appendActivity(ALPHA, []);

        expect(selectActivityFor(ALPHA)(store.getState())).toBe(before);
    });
});

describe('the narrowing of a timeline', () => {
    /** The filter is view state of the resource, like its buffer: a tab moved between groups keeps it. */
    it('keeps the narrowing of each resource apart', () => {
        const store = createActivityStore();

        store.getState().setNarrowing(ALPHA, {
            query: 'alpha',
            schemaOnly: true,
            sides: { inbound: false, other: true, outbound: true },
        });

        expect(selectNarrowingFor(ALPHA)(store.getState()).query).toBe('alpha');
        expect(selectNarrowingFor(BETA)(store.getState()).query).toBe('');
    });

    it('answers with the resting narrowing for a resource the head never touched', () => {
        const store = createActivityStore();

        const resting = selectNarrowingFor(ALPHA)(store.getState());

        expect(resting).toEqual({
            query: '',
            schemaOnly: false,
            sides: { inbound: true, other: true, outbound: true },
        });
        // A stable reference: a quiet resource must not redraw the panel on every batch.
        expect(selectNarrowingFor(BETA)(store.getState())).toBe(resting);
    });

    /** Clearing what arrived says nothing about what the head is asking for. */
    it('keeps the narrowing when the buffer of the resource is cleared', () => {
        const store = createActivityStore();

        store.getState().setNarrowing(ALPHA, {
            query: 'alpha',
            schemaOnly: false,
            sides: { inbound: true, other: true, outbound: false },
        });
        store.getState().appendActivity(ALPHA, batch(2));
        store.getState().clearActivity(ALPHA);

        expect(selectNarrowingFor(ALPHA)(store.getState()).query).toBe('alpha');
    });

    it('hands every narrowing back when the window changes what it is looking at', () => {
        const store = createActivityStore();

        store.getState().setNarrowing(ALPHA, {
            query: 'alpha',
            schemaOnly: true,
            sides: { inbound: true, other: false, outbound: true },
        });
        store.getState().reset();

        expect(selectNarrowingFor(ALPHA)(store.getState()).query).toBe('');
    });
});
