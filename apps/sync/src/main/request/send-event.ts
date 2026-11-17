import type { RequestSendRequest, Result } from '@mandor/ipc';
import type { HttpResponse } from '@mandor/schema';

import type { BodyHold } from './body-holds.js';

/** What left the machine: the request after its variables were resolved, and its body bytes. */
export type SentRequest = {
    method: string;
    url: string;
    headers: [string, string][];
    bytes: Uint8Array | undefined;
};

/**
 * A send that ended, told to whoever watches sends. `sent` is undefined when it ended before
 * anything was resolved, and then there is nothing to remember: no request ever existed.
 */
export type SendEvent = {
    /** The origin the send was made in: it may have changed by the time the send ends. */
    root: string;
    input: RequestSendRequest;
    startedAt: Date;
    sent: SentRequest | undefined;
    outcome: Result<HttpResponse>;
    /** What keeps the bodies of the send, until the watcher is done: one it stores goes in too. */
    hold?: BodyHold | undefined;
};

/** Watches the end of every send. It answers after it is done and never decides the answer. */
export type SendObserver = (event: SendEvent) => Promise<void>;
