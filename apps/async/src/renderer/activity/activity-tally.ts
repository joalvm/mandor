import { pickByKind, type ActivityEntry, type ByEntryKind } from './activity-entry.js';

/** What one direction of the wire carried: how many frames, and what they weighed. */
type ActivityShare = {
    bytes: number;
    count: number;
};

/** The two directions of a timeline, counted apart. */
export type ActivityTally = {
    inbound: ActivityShare;
    outbound: ActivityShare;
};

const DIRECTION_OF_KIND: ByEntryKind<'in' | 'out' | undefined> = {
    'connection-message': (entry) => entry.detail.direction,
    'connection-fault': () => undefined,
    'connection-status': () => undefined,
    'connection-script': () => undefined,
};

/**
 * Which way an entry crossed the wire, or nothing when it never did: the timeline holds more
 * than frames, and a fault or the socket coming up is an entry too.
 */
export function directionOf(entry: ActivityEntry): 'in' | 'out' | undefined {
    return pickByKind(DIRECTION_OF_KIND, entry);
}

function shareOf(entries: readonly ActivityEntry[]): ActivityShare {
    return {
        bytes: entries.reduce((total, entry) => total + entry.bytes, 0),
        count: entries.length,
    };
}

/**
 * The foot of the timeline: frames in, frames out, and the bytes of each. An entry that carries
 * no direction is not a frame and lands in neither share — counting it as one would make the
 * two halves add up to more than what crossed the socket.
 */
export function tallyOf(entries: readonly ActivityEntry[]): ActivityTally {
    return {
        inbound: shareOf(entries.filter((entry) => directionOf(entry) === 'in')),
        outbound: shareOf(entries.filter((entry) => directionOf(entry) === 'out')),
    };
}
