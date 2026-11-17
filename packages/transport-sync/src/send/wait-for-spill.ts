import type { Dispatcher } from 'undici';

import type { BodyReader } from '../body/read-body.js';

/** The part of undici's controller that holds the wire. */
type WireValve = Pick<Dispatcher.DispatchController, 'paused' | 'pause' | 'resume'>;

/**
 * Holds the wire while the spill is behind and lets it go once the spill caught up: a disk slower
 * than the network would otherwise pile the body up in memory, the very thing the spill avoids.
 */
export function waitForSpill(wire: WireValve, reader: BodyReader): void {
    if (wire.paused || !reader.behind) {
        return;
    }

    wire.pause();
    void reader.caughtUp().then(() => {
        wire.resume();
    });
}
