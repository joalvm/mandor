import type { Origin } from '@mandor/schema';

/**
 * The four things an origin can be to the reader: the local one asks nobody, a remote one is
 * being asked, and once it answers it is either reachable or not. The word is the reader's; the
 * check below is main's.
 */
export type OriginHealth = 'available' | 'checking' | 'reachable' | 'unreachable';

/** What the panel knows about one check: still waiting, or the answer it gave. */
export type OriginCheckState = 'checking' | boolean | undefined;

/** Reads the health of an origin out of what the panel knows about its check. */
export function originHealthOf(origin: Origin, check: OriginCheckState): OriginHealth {
    if (origin.kind === 'local') {
        return 'available';
    }

    if (check === undefined || check === 'checking') {
        return 'checking';
    }

    return check ? 'reachable' : 'unreachable';
}

// Green what works, amber the question, red the silence.
const DOT_OF_HEALTH = {
    available: 'connected',
    checking: 'connecting',
    reachable: 'connected',
    unreachable: 'error',
} as const satisfies Record<OriginHealth, string>;

/** The state the dot paints for each health. */
export function healthDotState(health: OriginHealth): (typeof DOT_OF_HEALTH)[OriginHealth] {
    return DOT_OF_HEALTH[health];
}
