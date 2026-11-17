import { EventEmitter } from 'node:events';

import { vi } from 'vitest';

import { watchWindowFaults, type FaultQuestion } from '../../../src/window/window-faults.js';

/**
 * A window and an app that are only emitters, watched by `watchWindowFaults` with doubles for
 * everything it reaches: the clock, the dialog, the log and the notices. The state is plain
 * fields so a test reads what happened and moves the clock without any Electron around.
 */
export type WatchedWindow = {
    app: EventEmitter;
    asked: FaultQuestion[];
    /** What the person chooses; a negative number leaves the question open until `reply`. */
    answer: number;
    clock: number;
    contents: EventEmitter;
    logged: [level: string, message: string][];
    quit: () => void;
    raised: [code: string, tone: string, key: unknown][];
    reload: () => void;
    reply: ((choice: number) => void) | undefined;
    stop: () => void;
};

export function watchWindow(): WatchedWindow {
    const reload = vi.fn();
    const contents = Object.assign(new EventEmitter(), { reload });
    const watched: WatchedWindow = {
        app: new EventEmitter(),
        asked: [],
        answer: 0,
        clock: 1_000_000,
        contents,
        logged: [],
        quit: vi.fn(),
        raised: [],
        reload,
        reply: undefined,
        stop: () => undefined,
    };

    watched.stop = watchWindowFaults(
        { webContents: contents },
        {
            app: watched.app,
            ask: (question) => {
                watched.asked.push(question);

                if (watched.answer < 0) {
                    return new Promise((resolve) => {
                        watched.reply = resolve;
                    });
                }

                return Promise.resolve(watched.answer);
            },
            logger: {
                log: (level, message) => {
                    watched.logged.push([level, message]);
                },
                flush: () => Promise.resolve(),
            },
            now: () => watched.clock,
            outbox: {
                raise: (code, tone, _params, key) => {
                    watched.raised.push([code, tone, key]);
                },
                list: () => [],
            },
            quit: watched.quit,
        },
    );

    return watched;
}
