import { httpResponseSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { createRequestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import {
    IDLE_SEND,
    initialResponsesSlice,
} from '../../../../src/renderer/features/requests/responses.slice.js';

const R1 = 'r1';
const R2 = 'r2';
const SEND = '6f0c2f8e-7a3b-4c52-9a38-0d3f8b8c3e11';
const OTHER = '0b1a5d2c-3e4f-4a6b-8c7d-9e0f1a2b3c4d';

const RESPONSE = httpResponseSchema.parse({
    status: 200,
    statusText: 'OK',
    httpVersion: '1.1',
    headers: [],
    body: null,
    sizes: { transferredBytes: 0, bodyBytes: 0, decoded: true },
    timings: { dnsMs: 0, connectMs: 0, tlsMs: 0, firstByteMs: 0, totalMs: 0, viaProxy: false },
    redirects: [],
    cookies: [],
});

describe('initialResponsesSlice', () => {
    it('starts with no resource having sent anything', () => {
        expect(initialResponsesSlice()).toEqual({ sends: {} });
        expect(IDLE_SEND).toEqual({ state: 'idle' });
    });
});

describe('the sends of the requests store', () => {
    it('files the send in flight under its resource and the id that can cut it', () => {
        const store = createRequestsStore();

        store.getState().beginSend(R1, SEND);

        expect(store.getState().sends[R1]).toEqual({ sendId: SEND, state: 'sending' });
    });

    it('replaces the answer of the last send when a new one begins', () => {
        const store = createRequestsStore();

        store.getState().beginSend(R1, SEND);
        store.getState().finishSend(R1, SEND, { response: RESPONSE, state: 'done' });
        store.getState().beginSend(R1, OTHER);

        expect(store.getState().sends[R1]).toEqual({ sendId: OTHER, state: 'sending' });
    });

    /** The id stays with the answer: the output of the scripts of that send is filed under it. */
    it('keeps what a finished send brought, the response or the code that stopped it', () => {
        const store = createRequestsStore();

        store.getState().beginSend(R1, SEND);
        store.getState().finishSend(R1, SEND, { response: RESPONSE, state: 'done' });
        store.getState().beginSend(R2, OTHER);
        store.getState().finishSend(R2, OTHER, { error: 'request-timeout', state: 'failed' });

        expect(store.getState().sends[R1]).toEqual({
            response: RESPONSE,
            sendId: SEND,
            state: 'done',
        });
        expect(store.getState().sends[R2]).toEqual({
            error: 'request-timeout',
            sendId: OTHER,
            state: 'failed',
        });
    });

    it('ignores the answer of a send that another one already replaced', () => {
        const store = createRequestsStore();

        store.getState().beginSend(R1, SEND);
        store.getState().beginSend(R1, OTHER);
        store.getState().finishSend(R1, SEND, { error: 'request-aborted', state: 'failed' });

        expect(store.getState().sends[R1]).toEqual({ sendId: OTHER, state: 'sending' });
    });

    it('is forgotten with the rest of the store on reset', () => {
        const store = createRequestsStore();

        store.getState().beginSend(R1, SEND);
        store.getState().reset();

        expect(store.getState().sends).toEqual({});
    });
});
