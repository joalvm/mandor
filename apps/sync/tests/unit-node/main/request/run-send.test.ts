import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';

import { secretsOfRun } from '@mandor/host/testing';
import { bodyFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { removeUnheldBodies } from '../../../../src/main/request/body-holds.js';
import { BIG, SECRET, startSendFixture, type SendFixture } from './support/send-fixture.js';

let fixture: SendFixture;

beforeEach(async () => {
    fixture = await startSendFixture();
});

afterEach(async () => {
    await fixture.stop();
});

describe('sending the request the window shows', () => {
    it('resolves the environment, sends the body and answers the response', async () => {
        const answer = await fixture.send({
            method: 'POST',
            url: '{{baseUrl}}/echo',
            body: { type: 'json', content: '{"a":1}' },
        });

        expect(answer).toMatchObject({ ok: true, value: { status: 200, httpVersion: '1.1' } });
        expect(fixture.received[0]).toMatchObject({ method: 'POST', body: '{"a":1}' });
        expect(fixture.received[0]?.headers['content-type']).toBe('application/json');
        expect(fixture.proxied).toEqual([`${fixture.origin}/echo`]);
        expect(fixture.inflight.size).toBe(0);
    });

    it('answers a body that is not text as base64, whole', async () => {
        const answer = await fixture.send({ url: '{{baseUrl}}/binary' });

        expect(answer).toMatchObject({
            ok: true,
            value: { body: { kind: 'inline', encoding: 'base64', data: '//4AgA==' } },
        });
    });

    it('keeps a big body on disk and answers its reference', async () => {
        const answer = await fixture.send({ url: '{{baseUrl}}/big' });

        expect(answer.ok && answer.value.body?.kind).toBe('stored');

        if (answer.ok && answer.value.body?.kind === 'stored') {
            const stored = await readFile(bodyFile(fixture.root, answer.value.body.ref));

            // A deep equal walks a buffer one byte at a time: seconds, for a body this big.
            expect(stored.equals(BIG)).toBe(true);
        }
    });

    it('holds the big body it spilled while its watcher runs, and lets it go after', async () => {
        const ref = createHash('sha256').update(BIG).digest('hex');
        const file = bodyFile(fixture.root, ref);
        const kept: boolean[] = [];

        fixture.whileWatched(async () => {
            await removeUnheldBodies(fixture.root, [ref]);
            kept.push(
                await stat(file).then(
                    () => true,
                    () => false,
                ),
            );
        });
        await fixture.send({ url: '{{baseUrl}}/big' });
        await removeUnheldBodies(fixture.root, [ref]);

        expect(kept).toEqual([true]);
        await expect(stat(file)).rejects.toThrow();
    });

    it('names the redirect it followed', async () => {
        const answer = await fixture.send({ url: '{{baseUrl}}/redirect' });

        expect(answer).toMatchObject({
            ok: true,
            value: {
                status: 200,
                redirects: [{ status: 302, to: `${fixture.origin}/echo` }],
            },
        });
    });

    it('learns the secret before anything can refuse, so the run redacts it', async () => {
        await fixture.send({
            url: '{{baseUrl}}/echo',
            headers: [{ key: 'X-Key', value: '{{token}}', enabled: true }],
        });

        expect(secretsOfRun()).toContain(SECRET);
        expect(fixture.received[0]?.headers['x-key']).toBe(SECRET);
    });
});
