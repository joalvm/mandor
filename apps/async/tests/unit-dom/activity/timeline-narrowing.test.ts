import { describe, expect, it } from 'vitest';

import type { ActivityEntry } from '../../../src/renderer/activity/activity-entry.js';
import {
    narrowTimeline,
    type TimelineNarrowing,
    type TimelineSides,
} from '../../../src/renderer/activity/lib/timeline-narrowing.js';
import {
    faultEntryOf,
    messageEntryOf,
    scriptEntryOf,
    statusEntryOf,
} from '../support/activity-entries.js';

function frame(id: string, direction: 'in' | 'out'): ActivityEntry {
    return messageEntryOf({ at: 0, data: `payload ${id}`, direction }, id);
}

function fault(id: string): ActivityEntry {
    return { ...faultEntryOf('ws-open-failed', 0), id };
}

function sidesWith(partial: Partial<TimelineSides>): TimelineSides {
    return { inbound: true, other: true, outbound: true, ...partial };
}

function narrowingWith(partial: Partial<TimelineNarrowing> = {}): TimelineNarrowing {
    return { query: '', schemaOnly: false, sides: sidesWith({}), ...partial };
}

describe('narrowing the timeline', () => {
    it('keeps every entry while no side is hidden and no query is written', () => {
        const entries = [frame('a', 'in'), frame('b', 'out'), fault('c')];

        expect(narrowTimeline(entries, narrowingWith())).toEqual(entries);
    });

    it('drops the side that is turned off, whichever it is', () => {
        const entries = [frame('a', 'in'), frame('b', 'out'), fault('c')];

        expect(
            narrowTimeline(entries, narrowingWith({ sides: sidesWith({ outbound: false }) })).map(
                (entry) => entry.id,
            ),
        ).toEqual(['a', 'c']);
        expect(
            narrowTimeline(entries, narrowingWith({ sides: sidesWith({ inbound: false }) })).map(
                (entry) => entry.id,
            ),
        ).toEqual(['b', 'c']);
    });

    it('reads a fault as the side that crossed no wire', () => {
        const entries = [frame('a', 'in'), fault('b'), { ...scriptEntryOf(), id: 'c' }];

        expect(
            narrowTimeline(entries, narrowingWith({ sides: sidesWith({ other: false }) })).map(
                (entry) => entry.id,
            ),
        ).toEqual(['a']);
    });

    /** The socket coming up frames every frame after it: hiding a side never hides it. */
    it('keeps the socket coming up or going down whichever sides are turned off', () => {
        const entries = [
            { ...statusEntryOf('connected', 0), id: 'a' },
            frame('b', 'in'),
            fault('c'),
        ];
        const none = sidesWith({ inbound: false, other: false, outbound: false });

        expect(
            narrowTimeline(entries, narrowingWith({ sides: none })).map((entry) => entry.id),
        ).toEqual(['a']);
    });

    it('keeps only the entries whose text carries the query', () => {
        const entries = [frame('a', 'in'), frame('b', 'out')];

        expect(
            narrowTimeline(entries, narrowingWith({ query: 'PAYLOAD A' })).map((entry) => entry.id),
        ).toEqual(['a']);
    });

    it('finds a fault by the code it failed with', () => {
        const entries = [frame('a', 'in'), fault('b')];

        expect(
            narrowTimeline(entries, narrowingWith({ query: 'ws-open' })).map((entry) => entry.id),
        ).toEqual(['b']);
    });

    it('hides a fault whose code does not carry the query', () => {
        const entries = [frame('a', 'in'), fault('b')];

        expect(
            narrowTimeline(entries, narrowingWith({ query: 'payload' })).map((entry) => entry.id),
        ).toEqual(['a']);
    });

    describe('the schema mark', () => {
        it('keeps only the entries the judge condemned while the mark is on', () => {
            const entries = [frame('a', 'in'), frame('b', 'out'), fault('c')];

            expect(
                narrowTimeline(entries, narrowingWith({ schemaOnly: true }), new Set(['b'])).map(
                    (entry) => entry.id,
                ),
            ).toEqual(['b']);
        });

        /** Without a verdict there is nothing the mark can vouch for, so the timeline goes empty. */
        it('hides what no verdict names while the mark is on', () => {
            const entries = [frame('a', 'in'), fault('c')];

            expect(narrowTimeline(entries, narrowingWith({ schemaOnly: true }))).toEqual([]);
        });

        /** The entry criterion: a filter is a view, so lifting it hands back every entry. */
        it('brings every entry back once the mark is lifted, having deleted none', () => {
            const entries = [frame('a', 'in'), frame('b', 'out'), fault('c')];

            const narrowed = narrowTimeline(
                entries,
                narrowingWith({ schemaOnly: true }),
                new Set(['b']),
            );

            expect(narrowed).toHaveLength(1);
            expect(narrowTimeline(entries, narrowingWith())).toEqual(entries);
            expect(entries).toHaveLength(3);
        });
    });
});
