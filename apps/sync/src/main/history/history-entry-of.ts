import { createHash } from 'node:crypto';

import type { HistoryEntry, HttpResponse, ResponseBody } from '@mandor/schema';

import type { BodyHold } from '../request/body-holds.js';
import { diskBodySpill } from '../request/disk-body-spill.js';
import { decodedBytes, encodingOf } from '../request/response-of.js';
import type { SendEvent, SentRequest } from '../request/send-event.js';
import { HISTORY_INLINE_BYTES } from './history-limits.js';

/** A send that left the machine: the only kind that has a request to remember. */
export type RecordedSend = SendEvent & { sent: SentRequest };

const UNKNOWN_TYPE = 'application/octet-stream';

function contentTypeOf(headers: readonly (readonly [string, string])[]): string {
    return headers.find(([name]) => name.toLowerCase() === 'content-type')?.[1] ?? UNKNOWN_TYPE;
}

/** The store of bodies of the origin, and the hold of the send that writes to it. */
type BodyStore = { root: string; hold: BodyHold | undefined };

/** Writes the bytes to the store of bodies, the same one a response too big for memory uses. */
async function storedBody(
    store: BodyStore,
    bytes: Uint8Array,
    contentType: string,
): Promise<ResponseBody> {
    const ref = createHash('sha256').update(bytes).digest('hex');
    const spill = await diskBodySpill(store.root, store.hold);

    try {
        await spill.write(bytes);
        await spill.finish(ref);
    } catch (error) {
        await spill.abort();

        throw error;
    }

    return { kind: 'stored', ref, bytes: bytes.length, contentType };
}

async function requestBodyOf(store: BodyStore, sent: SentRequest): Promise<ResponseBody | null> {
    const { bytes } = sent;

    if (bytes === undefined || bytes.length === 0) {
        return null;
    }

    if (bytes.length > HISTORY_INLINE_BYTES) {
        return storedBody(store, bytes, contentTypeOf(sent.headers));
    }

    return { kind: 'inline', ...encodingOf(bytes) };
}

/** The body of a response as the entry keeps it: a stored one by its ref, a big one stored now. */
async function responseBodyOf(
    store: BodyStore,
    response: HttpResponse,
): Promise<ResponseBody | null> {
    const { body } = response;

    if (body === null || body.kind === 'stored') {
        return body;
    }

    const bytes = decodedBytes(body);

    return bytes.length > HISTORY_INLINE_BYTES
        ? storedBody(store, bytes, contentTypeOf(response.headers))
        : body;
}

async function outcomeOf(store: BodyStore, event: RecordedSend): Promise<HistoryEntry['outcome']> {
    const { outcome } = event;

    if (!outcome.ok) {
        return { kind: 'failure', code: outcome.error.code, message: outcome.error.message };
    }

    const body = await responseBodyOf(store, outcome.value);

    return { kind: 'response', response: { ...outcome.value, body } };
}

/**
 * The entry of a send that ended: the request as it left, resolved, and the response or the
 * reason there was none. The template is not kept, because HAR and the comparison need what
 * went out. Bodies past the inline limit go to the store of bodies and stay here by reference.
 */
export async function historyEntryOf(root: string, event: RecordedSend): Promise<HistoryEntry> {
    const { input, sent } = event;
    const store = { root, hold: event.hold };

    return {
        id: input.sendId,
        workspaceId: input.workspaceId,
        itemPath: input.itemPath,
        environmentId: input.environmentId,
        sentAt: event.startedAt.toISOString(),
        request: {
            method: sent.method,
            url: sent.url,
            headers: sent.headers,
            body: await requestBodyOf(store, sent),
        },
        outcome: await outcomeOf(store, event),
    };
}
