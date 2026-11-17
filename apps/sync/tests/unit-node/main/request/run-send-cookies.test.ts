import { mkdir } from 'node:fs/promises';

import { cookieJarFile } from '@mandor/store-fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startSendFixture, type SendFixture } from './support/send-fixture.js';

let fixture: SendFixture;

beforeEach(async () => {
    fixture = await startSendFixture();
});

afterEach(async () => {
    await fixture.stop();
});

const LOCAL = { workspaceId: 'payments', environmentId: 'local' };

describe('sending with the cookie jar of the environment', () => {
    it('carries the cookie a login sets to the hop that follows it', async () => {
        await fixture.send({ url: '{{baseUrl}}/login' });

        expect(fixture.received.map((one) => one.headers.cookie)).toEqual([undefined, 'sid=abc']);
    });

    it('sends the cookie the jar kept in the next send of the same environment', async () => {
        await fixture.send({ url: '{{baseUrl}}/login' });
        await fixture.send({ url: '{{baseUrl}}/echo' });

        expect(fixture.received.at(-1)?.headers.cookie).toBe('sid=abc');
    });

    it('joins the cookie written by hand with the jar in one header', async () => {
        await fixture.send({ url: '{{baseUrl}}/login' });
        await fixture.send({
            url: '{{baseUrl}}/echo',
            headers: [{ key: 'Cookie', value: 'mine=1', enabled: true }],
        });

        expect(fixture.received.at(-1)?.headers.cookie).toBe('mine=1; sid=abc');
    });

    it('keeps the jar on disk, so a new run of the app still has it', async () => {
        await fixture.send({ url: '{{baseUrl}}/login' });

        const again = await fixture.cookieJars.jarOf({ root: fixture.root, ...LOCAL });
        const cookies = await again.getCookies(fixture.origin);

        expect(cookies.map((cookie) => cookie.key)).toEqual(['sid']);
    });

    /** The answer arrived: a jar that cannot be kept costs the next send its cookies, not this one. */
    it('answers the response even when the jar cannot be kept', async () => {
        await mkdir(cookieJarFile(fixture.root, LOCAL.workspaceId, LOCAL.environmentId), {
            recursive: true,
        });

        const answer = await fixture.send({ url: '{{baseUrl}}/login' });

        expect(answer).toMatchObject({ ok: true, value: { status: 200 } });
    });

    it('shows the history the Cookie the first hop left with', async () => {
        await fixture.send({ url: '{{baseUrl}}/login' });

        await fixture.send({ url: '{{baseUrl}}/echo' });

        expect(fixture.sends.at(-1)?.headers).toContainEqual(['Cookie', 'sid=abc']);
    });
});
