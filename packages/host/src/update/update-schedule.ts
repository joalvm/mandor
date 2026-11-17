import type { UpdateConfigureRequest, UpdateSupport } from '@mandor/ipc';

import type { UpdatePort } from './update-port.js';

/** The clock, handed in: each call gives back how to cancel what it started. */
export type UpdateTimers = {
    after: (run: () => void, ms: number) => () => void;
    every: (run: () => void, ms: number) => () => void;
};

export type UpdateSchedule = {
    /** What the person chose, handed over when the window is up and at every change. */
    configure: (choice: UpdateConfigureRequest) => void;
    /** The window drew what it restored: the first look counts its wait from here. */
    ready: () => void;
    /** Cancels what is waiting. */
    dispose: () => void;
};

export type ScheduleOptions = {
    port: UpdatePort;
    support: UpdateSupport;
    timers: UpdateTimers;
    /** How long after the window is ready, and chosen, the first look waits. */
    firstAfter?: number;
    /** How long between one look and the next. */
    every?: number;
};

const TEN_SECONDS = 10_000;
const SIX_HOURS = 6 * 60 * 60 * 1000;

/** The clock of the process. */
export const systemTimers: UpdateTimers = {
    // timing-policy: the schedule of the looks is the clock itself; tests hand in their own.
    after: (run, ms) => {
        const id = setTimeout(run, ms);

        return () => {
            clearTimeout(id);
        };
    },
    // timing-policy: same clock as above, for the looks that follow the first.
    every: (run, ms) => {
        const id = setInterval(run, ms);

        return () => {
            clearInterval(id);
        };
    },
};

/**
 * Looks for a version by itself: once shortly after the window is up and chosen, then every few
 * hours. Nothing is looked for in `manual`, nor on an install that cannot update. The mode also
 * says whether a version found is downloaded, and only an install that replaces itself can.
 *
 * A look that fails is not told: being offline is normal, and the state records it anyway.
 */
export function scheduleChecks(options: ScheduleOptions): UpdateSchedule {
    const { port, support, timers } = options;
    const stops: (() => void)[] = [];
    let choice: UpdateConfigureRequest | undefined;
    let isReady = false;

    const look = () => {
        void port.checkForUpdates();
    };

    const stop = () => {
        for (const cancel of stops.splice(0)) {
            cancel();
        }
    };

    const arm = () => {
        const looking =
            support !== 'unsupported' && choice !== undefined && choice.mode !== 'manual';

        if (!looking) {
            stop();

            return;
        }

        if (isReady && stops.length === 0) {
            stops.push(
                timers.after(() => {
                    look();
                    stops.push(timers.every(look, options.every ?? SIX_HOURS));
                }, options.firstAfter ?? TEN_SECONDS),
            );
        }
    };

    return {
        configure: (next) => {
            choice = next;
            port.setChannel(next.channel);
            port.setAutoDownload(next.mode === 'auto' && support === 'full');
            arm();
        },
        ready: () => {
            isReady = true;
            arm();
        },
        dispose: stop,
    };
}
