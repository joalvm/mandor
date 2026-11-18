import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { approvedScripts } from './support/approved-scripts.js';
import { SECRET, startSendFixture, type SendFixture } from './support/send-fixture.js';

let fixture: SendFixture;

beforeEach(async () => {
    fixture = await startSendFixture(approvedScripts());
});

afterEach(async () => {
    await fixture.stop();
});

function before(source: string) {
    return { scripts: { onBeforeRequest: { source } } };
}

function line(key: string, value: string) {
    return { key, value, enabled: true };
}

/**
 * Another origin on this machine: a server on another port, and what reached it. `/hop` sends
 * the request on to `hopTo`.
 */
async function otherOrigin(hopTo = '') {
    const received: IncomingHttpHeaders[] = [];
    const server: Server = createServer((request, response) => {
        received.push(request.headers);

        if (request.url === '/hop') {
            response.writeHead(307, { location: hopTo });
            response.end();

            return;
        }

        response.writeHead(200, { 'content-type': 'text/plain' });
        response.end('other');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    return {
        url: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
        received,
        close: () => new Promise((resolve) => server.close(resolve)),
    };
}

describe('a send whose scripts run before it leaves', () => {
    it('sends what a script wrote, and keeps the values it set for the next send', async () => {
        await fixture.send({
            url: '{{baseUrl}}/echo',
            ...before('request.headers.set("X-Run", "1"); vars.set("page", "2");'),
        });
        await fixture.send({
            url: '{{baseUrl}}/echo',
            headers: [line('X-Page', '{{page}}')],
        });

        expect(fixture.received[0]?.headers['x-run']).toBe('1');
        expect(fixture.received[1]?.headers['x-page']).toBe('2');
    });

    it('never fills a secret into a line a script wrote, and still fills the person’s', async () => {
        await fixture.send({
            url: '{{baseUrl}}/echo',
            headers: [line('X-Mine', '{{token}}')],
            ...before('request.headers.set("X-Api-Key", "{{token}}");'),
        });

        expect(fixture.received[0]?.headers['x-api-key']).toBe('{{token}}');
        expect(fixture.received[0]?.headers['x-mine']).toBe(SECRET);
    });

    it('sends no secret of the person to an origin a script moved the request to', async () => {
        const other = await otherOrigin();

        try {
            const answer = await fixture.send({
                url: '{{baseUrl}}/echo',
                headers: [line('X-Mine', '{{token}}')],
                ...before(`request.url = "${other.url}/steal";`),
            });

            expect(answer.ok).toBe(true);
            expect(fixture.received).toEqual([]);
            expect(other.received[0]?.['x-mine']).toBe('{{token}}');
        } finally {
            await other.close();
        }
    });

    it('keeps the request from leaving when a script fails, and says which one', async () => {
        const answer = await fixture.send({
            url: '{{baseUrl}}/echo',
            ...before('throw new Error("no token yet");'),
        });

        expect(answer).toMatchObject({ ok: false, error: { code: 'script-failed' } });
        expect(!answer.ok && answer.error.message).toContain('no token yet');
        expect(!answer.ok && answer.error.message).toContain('request Echo');
        expect(fixture.received).toEqual([]);
    });

    it('runs no script when the send skips them, and still resolves what scripts set before', async () => {
        await fixture.send({ url: '{{baseUrl}}/echo', ...before('vars.set("page", "3");') });
        await fixture.send(
            {
                url: '{{baseUrl}}/echo',
                headers: [line('X-Page', '{{page}}')],
                ...before('request.headers.set("X-Run", "1");'),
            },
            { skipScripts: true },
        );

        expect(fixture.received[1]?.headers['x-run']).toBeUndefined();
        expect(fixture.received[1]?.headers['x-page']).toBe('3');
    });

    it('drops the secret lines of a send a script shaped at a hop to another origin', async () => {
        const other = await otherOrigin(`${fixture.origin}/echo`);

        try {
            const shaped = await fixture.send({
                url: `${other.url}/hop`,
                headers: [line('X-Mine', '{{token}}')],
                ...before('request.headers.set("X-Run", "1");'),
            });
            const plain = await fixture.send({
                url: `${other.url}/hop`,
                headers: [line('X-Mine', '{{token}}')],
            });

            expect([shaped.ok, plain.ok]).toEqual([true, true]);
            expect(other.received[0]?.['x-mine']).toBe(SECRET);
            expect(fixture.received[0]?.headers['x-run']).toBe('1');
            expect(fixture.received[0]?.headers['x-mine']).toBeUndefined();
            expect(fixture.received[1]?.headers['x-mine']).toBe(SECRET);
        } finally {
            await other.close();
        }
    });
});
