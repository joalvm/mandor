import { errors, type Dispatcher } from 'undici';

import { responseOf } from './hop-response.js';
import type { RawResponseHandler } from './response-handler.js';
import type { BodyReader } from '../body/read-body.js';
import type { ConnectionPhases } from '../timing/connection-phases.js';
import type { SyncRequest } from '../request/sync-request.js';
import type { SyncResponse } from '../response/sync-response.js';

/** The live pieces of one dispatch: what reads the body, what read the head, what carries the timings. */
export type HopParts = {
    agent: Dispatcher;
    reader: BodyReader | undefined;
    handler: RawResponseHandler;
    phases: ConnectionPhases;
};

export type HopOutcome = {
    response: SyncResponse;
    phases: ConnectionPhases;
};

/**
 * Ends one dispatch: drains or discards the body, closes the dispatcher either way, and answers
 * with the response of the hop or re-raises the error that killed it. The reader never outlives
 * its dispatcher: a body left open by an error is aborted before the promise settles.
 */
export async function settleHop(
    parts: HopParts,
    request: SyncRequest,
    error?: Error,
): Promise<HopOutcome> {
    const { agent, handler, phases } = parts;

    try {
        if (error !== undefined) {
            await parts.reader?.abort();
            throw error;
        }

        const body = await parts.reader?.finish();

        if (body === undefined) {
            throw new Error('the response ended without a head');
        }

        return { response: responseOf(handler, phases, body, request), phases };
    } finally {
        await agent.close().catch(unlessDestroyed);
    }
}

/** A send cancelled before its socket was up tore its dispatcher down: nothing is left to close. */
function unlessDestroyed(error: unknown): void {
    if (!(error instanceof errors.ClientDestroyedError)) {
        throw error;
    }
}
