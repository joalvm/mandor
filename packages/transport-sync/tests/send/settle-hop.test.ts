import { describe, expect, it } from 'vitest';
import { errors, type Dispatcher } from 'undici';

import { settleHop } from '../../src/send/settle-hop.js';
import { RawResponseHandler } from '../../src/send/response-handler.js';
import type { BodyReader } from '../../src/body/read-body.js';
import type { SyncRequest } from '../../src/request/sync-request.js';

function phases() {
    return {
        dnsMs: 0,
        connectMs: 0,
        tlsMs: 0,
        firstByteAt: 0,
        lastPhaseEndAt: 0,
        alpnProtocol: null,
        network: null,
    };
}

function agent(): Dispatcher & { closed: () => boolean } {
    let closed = false;

    return {
        close: () => {
            closed = true;

            return Promise.resolve();
        },
        closed: () => closed,
    } as unknown as Dispatcher & { closed: () => boolean };
}

/** A dispatcher whose close fails the way the given error says. */
function failingAgent(error: Error): Dispatcher {
    return { close: () => Promise.reject(error) } as unknown as Dispatcher;
}

function reader(outcome: 'ok' | 'broken'): BodyReader {
    return {
        finish: () =>
            outcome === 'ok'
                ? Promise.resolve({
                      body: { kind: 'inline', bytes: Buffer.from('ok') },
                      sizes: { transferredBytes: 2, bodyBytes: 2, decoded: true },
                  })
                : Promise.reject(new Error('the body was broken')),
        abort: () => Promise.resolve(),
    } as unknown as BodyReader;
}

const request = { method: 'GET', url: 'http://a.test/', headers: [] } as unknown as SyncRequest;

describe('settleHop', () => {
    it('answers with the response of the hop and closes the dispatcher', async () => {
        const hop = agent();
        const handler = new RawResponseHandler();

        handler.onResponseStart(
            { rawHeaders: [] } as unknown as Dispatcher.DispatchController,
            200,
            [],
            'OK',
        );

        const outcome = await settleHop(
            { agent: hop, reader: reader('ok'), handler, phases: phases() },
            request,
        );

        expect(outcome.response.status).toBe(200);
        expect(hop.closed()).toBe(true);
    });

    it('aborts the reader, keeps the error and closes the dispatcher when the hop died', async () => {
        const hop = agent();
        const handler = new RawResponseHandler();

        await expect(
            settleHop(
                { agent: hop, reader: reader('broken'), handler, phases: phases() },
                request,
                new Error('socket died'),
            ),
        ).rejects.toThrow('socket died');
        expect(hop.closed()).toBe(true);
    });

    it('fails when the response ended without a head', async () => {
        const hop = agent();

        await expect(
            settleHop(
                {
                    agent: hop,
                    reader: undefined,
                    handler: new RawResponseHandler(),
                    phases: phases(),
                },
                request,
            ),
        ).rejects.toThrow('the response ended without a head');
        expect(hop.closed()).toBe(true);
    });

    it('keeps the error of the hop when its dispatcher was already torn down', async () => {
        await expect(
            settleHop(
                {
                    agent: failingAgent(new errors.ClientDestroyedError()),
                    reader: undefined,
                    handler: new RawResponseHandler(),
                    phases: phases(),
                },
                request,
                new Error('cancelled while dialing'),
            ),
        ).rejects.toThrow('cancelled while dialing');
    });

    it('lets out a close that failed for another cause', async () => {
        await expect(
            settleHop(
                {
                    agent: failingAgent(new Error('the close broke')),
                    reader: undefined,
                    handler: new RawResponseHandler(),
                    phases: phases(),
                },
                request,
                new Error('socket died'),
            ),
        ).rejects.toThrow('the close broke');
    });
});
