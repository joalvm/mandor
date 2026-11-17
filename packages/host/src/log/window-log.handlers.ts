import { CHANNELS, logWriteRequestSchema, success, type LogWriteRequest } from '@mandor/ipc';

import { checkedRequest } from '../ipc/checked-request.js';
import type { HandlerIpc } from '../ipc/handler-ipc.js';
import type { Logger } from './create-logger.js';

/** A window that faults in a loop must not fill the log: past this many lines, they are counted. */
const LINES_PER_MINUTE = 50;
const MINUTE_MS = 60_000;

export type WindowLogDeps = {
    logger: Logger;
    /** The clock, for the minute of the ceiling. */
    now?: () => number;
};

function lineOf(request: LogWriteRequest): string {
    const head = `window ${request.source}: ${request.message}`;

    return request.stack === undefined ? head : `${head}\n${request.stack}`;
}

/**
 * The one channel through which the window writes in the log of main. Only a fault is told,
 * with its origin and a stack, and never more than a few lines a minute: when a minute opens
 * after one that ran over, a line says how many were dropped. The logger redacts what it writes,
 * as for every other line.
 */
export function registerWindowLogHandlers(ipc: HandlerIpc, deps: WindowLogDeps): () => void {
    const now = deps.now ?? Date.now;
    let opened = Number.NEGATIVE_INFINITY;
    let written = 0;
    let dropped = 0;

    ipc.handle(CHANNELS.logWrite, (_event, raw) => {
        const request = checkedRequest(logWriteRequestSchema, raw);

        if (!request.ok) {
            return Promise.resolve(request);
        }

        if (now() - opened >= MINUTE_MS) {
            if (dropped > 0) {
                deps.logger.log('warn', `${String(dropped)} lines from the window were dropped`);
            }

            opened = now();
            written = 0;
            dropped = 0;
        }

        if (written < LINES_PER_MINUTE) {
            written += 1;
            deps.logger.log(request.value.level, lineOf(request.value));
        } else {
            dropped += 1;
        }

        return Promise.resolve(success({}));
    });

    return () => {
        ipc.removeHandler(CHANNELS.logWrite);
    };
}
