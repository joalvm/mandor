import { closeRepo, noScripts } from '@mandor/host/testing';
import { requestSendRequestSchema } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { responsesInFlight } from '../../../../src/main/request/responses-in-flight.js';
import { runSend } from '../../../../src/main/request/run-send.js';
import { startSendFixture, type SendFixture } from './support/send-fixture.js';

let fixture: SendFixture;

beforeEach(async () => {
    fixture = await startSendFixture();
});

afterEach(async () => {
    await fixture.stop();
});

describe('a send that does not end in a response', () => {
    it('refuses a payload the contract does not know', async () => {
        const deps = {
            readSecret: () => Promise.resolve(null),
            networkFor: () => Promise.resolve({ tls: {} }),
            ...noScripts(),
            inFlight: responsesInFlight(),
            logger: { log: () => undefined },
        };
        const answer = await runSend(deps, fixture.inflight, { sendId: 'nope' });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    /** Going direct instead would skip the proxy of a network that demanded it, in silence. */
    it('answers network-proxy, and sends nothing, when the proxy is one requests do not speak', async () => {
        const deps = {
            readSecret: () => Promise.resolve(null),
            networkFor: () => Promise.resolve({ proxy: { url: 'socks4://127.0.0.1:1' }, tls: {} }),
            ...noScripts(),
            inFlight: responsesInFlight(),
            logger: { log: () => undefined },
        };
        const answer = await runSend(
            deps,
            fixture.inflight,
            fixture.payload({ url: '{{baseUrl}}/echo' }),
        );

        expect(answer).toMatchObject({ ok: false, error: { code: 'network-proxy' } });
        expect(fixture.received).toEqual([]);
    });

    it('refuses while no origin is open', async () => {
        closeRepo();

        const answer = await fixture.send({ url: '{{baseUrl}}/echo' });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('refuses a variable in the authority of the url as a bad request', async () => {
        const answer = await fixture.send({ url: 'http://{{baseUrl}}/x' });

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('sends a variable nobody defined as the text it was written', async () => {
        const answer = await fixture.send({ url: '{{baseUrl}}/{{missing}}' });

        expect(answer).toMatchObject({ ok: true });
        expect(fixture.sends[0]?.url).toContain('missing');
    });

    it('answers request-aborted when the send is cut while waiting', async () => {
        const sendId = crypto.randomUUID();
        const pending = fixture.send({ url: '{{baseUrl}}/slow' }, { sendId });

        await vi.waitFor(() => {
            expect(fixture.received.length).toBe(1);
        });
        fixture.inflight.get(sendId)?.abort();

        expect(await pending).toMatchObject({ ok: false, error: { code: 'request-aborted' } });
        expect(fixture.inflight.size).toBe(0);
    });

    it('answers request-timeout when the server takes longer than the settings allow', async () => {
        const answer = await fixture.send({
            url: '{{baseUrl}}/slow',
            settings: { timeoutMs: 150, followRedirects: true, maxRedirects: 5, validateTls: true },
        });

        expect(answer).toMatchObject({ ok: false, error: { code: 'request-timeout' } });
    });

    it('answers request-unreachable when nobody listens', async () => {
        const answer = await fixture.send({ url: 'http://127.0.0.1:1/x' });

        expect(answer).toMatchObject({ ok: false, error: { code: 'request-unreachable' } });
    });

    it('answers request-file when the body names a file that is not there', async () => {
        const answer = await fixture.send({
            url: '{{baseUrl}}/echo',
            method: 'POST',
            body: { type: 'binary', file: 'missing.bin' },
        });

        expect(answer).toMatchObject({ ok: false, error: { code: 'request-file' } });
    });

    it('accepts what its own contract describes', () => {
        const payload = fixture.payload({ url: 'http://a.test/' });

        expect(requestSendRequestSchema.safeParse(payload).success).toBe(true);
    });
});
