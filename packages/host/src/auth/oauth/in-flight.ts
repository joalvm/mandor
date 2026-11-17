import type { StoredToken } from './stored-token.js';

const running = new Map<string, Promise<StoredToken>>();

/**
 * One flow per key at a time: a caller that arrives while the same flow runs waits for it and
 * gets its answer, instead of opening a second browser for the same person.
 */
export function inFlight(key: string, start: () => Promise<StoredToken>): Promise<StoredToken> {
    const existing = running.get(key);

    if (existing !== undefined) {
        return existing;
    }

    const flow = start().finally(() => {
        running.delete(key);
    });

    running.set(key, flow);

    return flow;
}
