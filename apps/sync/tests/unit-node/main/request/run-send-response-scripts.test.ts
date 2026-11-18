import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { rememberSessionSecrets } from '@mandor/host';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { approvedScripts } from './support/approved-scripts.js';
import { startSendFixture, type SendFixture } from './support/send-fixture.js';

let fixture: SendFixture;

beforeEach(async () => {
    fixture = await startSendFixture(approvedScripts());
});

afterEach(async () => {
    await fixture.stop();
});

function scripts(onResponse: string, onBeforeRequest?: string) {
    const before =
        onBeforeRequest === undefined ? {} : { onBeforeRequest: { source: onBeforeRequest } };

    return { scripts: { onResponse: { source: onResponse }, ...before } };
}

function line(key: string, value: string) {
    return { key, value, enabled: true };
}

/** What the window heard of one send, phase by phase. */
function phasesOf(sendId: string) {
    return fixture.told.filter((push) => push.sendId === sendId).map(({ phase }) => phase);
}

/** A send that runs no script: it waits for the scripts of an answer before it, and ends. */
function settle() {
    return fixture.send({ url: '{{baseUrl}}/echo' }, { skipScripts: true });
}

/** A server that marks a secret when it is asked, as the person would while a send flies. */
async function markingServer(secret: string) {
    const server: Server = createServer((_request, response) => {
        rememberSessionSecrets([secret]);
        response.end('marked');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    return {
        url: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
        close: () => {
            server.closeAllConnections();

            return new Promise((resolve) => server.close(resolve));
        },
    };
}

describe('a send whose scripts read its answer', () => {
    it('answers before them, and the next send waits for what they set', async () => {
        const sendId = crypto.randomUUID();
        const answer = await fixture.send(
            {
                url: '{{baseUrl}}/echo',
                headers: [line('X-Login', 'abc')],
                ...scripts(`
                    await sendRequest({ url: '${fixture.origin}/echo' });
                    vars.set('tok', response.json().headers['x-login']);
                    test('is 200', () => { if (response.status !== 200) throw new Error('no'); });
                `),
            },
            { sendId },
        );

        await fixture.send({ url: '{{baseUrl}}/echo', headers: [line('X-Tok', '{{tok}}')] });

        expect(answer.ok).toBe(true);
        expect(fixture.received.at(-1)?.headers['x-tok']).toBe('abc');
        expect(phasesOf(sendId)).toEqual(['before', 'response']);
        expect(fixture.told.find((push) => push.phase === 'response')?.tests).toEqual([
            { name: 'is 200', passed: true },
        ]);
    });

    it('hides from them a secret marked after the scripts before the send ran', async () => {
        const marker = await markingServer('late-secret-value');

        try {
            await fixture.send({
                url: '{{baseUrl}}/echo',
                headers: [line('X-Late', 'late-secret-value')],
                ...scripts(
                    `vars.set('seen', response.json().headers['x-late']);
                     vars.set('sent', request.headers.get('x-late'));`,
                    `await sendRequest({ url: '${marker.url}/mark' });`,
                ),
            });
            await fixture.send({
                url: '{{baseUrl}}/echo',
                headers: [line('X-Seen', '{{seen}}'), line('X-Sent', '{{sent}}')],
            });
        } finally {
            await marker.close();
        }

        const received = fixture.received.at(-1)?.headers;

        expect(fixture.received[0]?.headers['x-late']).toBe('late-secret-value');
        expect(received?.['x-seen']).toBeDefined();
        expect(received?.['x-seen']).not.toContain('late-secret-value');
        expect(received?.['x-sent']).toBeDefined();
        expect(received?.['x-sent']).not.toContain('late-secret-value');
    });

    it('keeps the answer when one of them fails, and tells the window why', async () => {
        const answer = await fixture.send({
            url: '{{baseUrl}}/echo',
            ...scripts('throw new Error("bad answer");'),
        });

        await settle();

        expect(answer.ok).toBe(true);
        expect(fixture.told.find((push) => push.phase === 'response')?.error?.message).toContain(
            'bad answer',
        );
    });

    it('gives a script no text of a body that is not text, and says so', async () => {
        await fixture.send({
            url: '{{baseUrl}}/binary',
            ...scripts('vars.set("t", String(response.text()));'),
        });
        await fixture.send({ url: '{{baseUrl}}/echo', headers: [line('X-T', '{{t}}')] });

        expect(fixture.received.at(-1)?.headers['x-t']).toBe('undefined');
        expect(fixture.told.find((push) => push.phase === 'response')?.logs).toContainEqual({
            level: 'warn',
            notice: 'response-body-unreadable',
        });
    });

    it('tells the window what the scripts before a send said when they keep it from leaving', async () => {
        const sendId = crypto.randomUUID();

        await fixture.send(
            {
                url: '{{baseUrl}}/echo',
                ...scripts('vars.set("v", "1");', 'throw new Error("not yet");'),
            },
            { sendId },
        );

        expect(phasesOf(sendId)).toEqual(['before']);
        expect(fixture.told[0]?.error?.message).toContain('not yet');
    });

    it('runs none of them when the send skips its scripts, and still tells its marks', async () => {
        const sendId = crypto.randomUUID();

        await fixture.send(
            { url: '{{baseUrl}}/echo', ...scripts('vars.set("v", "1");') },
            { sendId, skipScripts: true },
        );
        await fixture.send({ url: '{{baseUrl}}/echo', headers: [line('X-V', '{{v}}')] });

        expect(fixture.received.at(-1)?.headers['x-v']).toBe('{{v}}');
        expect(phasesOf(sendId)).toEqual(['before']);
        expect(fixture.told[0]).toMatchObject({ logs: [], withheld: [], destinationMoved: false });
    });

    it('cuts a send that waits for them when it is cancelled, and sends nothing', async () => {
        const sendId = crypto.randomUUID();

        await fixture.send({
            url: '{{baseUrl}}/echo',
            ...scripts(`await sendRequest({ url: '${fixture.origin}/slow' });`),
        });
        // The script of the answer is on the network now, and stays there.
        await vi.waitFor(() => {
            expect(fixture.received).toHaveLength(2);
        });

        const waiting = fixture.send(
            { url: '{{baseUrl}}/echo', headers: [line('X-B', '1')] },
            { sendId },
        );

        fixture.inflight.get(sendId)?.abort();

        expect(await waiting).toMatchObject({ ok: false, error: { code: 'request-aborted' } });
        expect(fixture.received.filter(({ headers }) => headers['x-b'] !== undefined)).toEqual([]);
    });
});
