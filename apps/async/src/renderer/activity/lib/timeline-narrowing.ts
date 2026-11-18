import { pickByKind, type ActivityEntry, type ByEntryKind } from '../activity-entry.js';
import { activityText } from '../activity-text.js';

/**
 * Which sides of the timeline stay drawn. `other` is the side of what went wrong without
 * crossing the wire — a fault — so hiding the two directions never takes the errors off the
 * panel with them.
 */
export type TimelineSides = {
    inbound: boolean;
    other: boolean;
    outbound: boolean;
};

/**
 * The state of the head of the timeline: the sides still drawn, what the search asks for, and
 * whether the timeline keeps only what breaks its schema.
 */
export type TimelineNarrowing = {
    query: string;
    schemaOnly: boolean;
    sides: TimelineSides;
};

/** One stable narrowing for every resource the head never touched: no copy, no redraw. */
export const RESTING_NARROWING: Readonly<TimelineNarrowing> = Object.freeze({
    query: '',
    schemaOnly: false,
    sides: Object.freeze({ inbound: true, other: true, outbound: true }),
});

const SIDE_OF_DIRECTION = { in: 'inbound', out: 'outbound' } as const;

/**
 * The side of the timeline an entry counts on. The socket coming up or going down counts on
 * none: it frames everything else, so no side hides it.
 */
const SIDE_OF_KIND: ByEntryKind<keyof TimelineSides | undefined> = {
    'connection-message': (entry) => SIDE_OF_DIRECTION[entry.detail.direction],
    'connection-fault': () => 'other',
    'connection-status': () => undefined,
    'connection-script': () => 'other',
};

function drawnSide(entry: ActivityEntry, sides: TimelineSides): boolean {
    const side = pickByKind(SIDE_OF_KIND, entry);

    return side === undefined || sides[side];
}

function matches(entry: ActivityEntry, query: string): boolean {
    return query === '' || activityText(entry).toLowerCase().includes(query);
}

/**
 * The timeline as the head of the panel leaves it: the sides still checked, narrowed by what the
 * search field holds, and — while the schema mark is on — held to the entries the judge
 * condemned. What carries no verdict yet stays out: the mark vouches for what it named and for
 * nothing else. The tally of the foot runs on the full timeline either way — the foot says what
 * the connection moved, not what the filter leaves on screen.
 */
export function narrowTimeline(
    entries: readonly ActivityEntry[],
    narrowing: TimelineNarrowing,
    offenders?: ReadonlySet<string>,
): ActivityEntry[] {
    const query = narrowing.query.trim().toLowerCase();

    return entries.filter((entry) => {
        if (!drawnSide(entry, narrowing.sides) || !matches(entry, query)) {
            return false;
        }

        return !narrowing.schemaOnly || (offenders?.has(entry.id) ?? false);
    });
}
