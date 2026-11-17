import { closeRepo } from '@mandor/host/testing';
import { CHANNELS } from '@mandor/ipc';
import { createRequestItem } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { codeOf, payload, useCodegenHarness } from './support/codegen-harness.js';

const CHANNEL_LIST = [CHANNELS.codegenFromCurl, CHANNELS.codegenSnippet];
const harness = useCodegenHarness();

describe('the channels of codegen', () => {
    it('registers both channels and removes them all', () => {
        expect(harness.ipc().registered()).toEqual(CHANNEL_LIST);

        harness.dispose();

        expect(harness.ipc().registered()).toEqual([]);
    });

    it('refuses what the contract does not describe, on both channels', async () => {
        for (const channel of CHANNEL_LIST) {
            expect(await harness.ipc().call(channel, { nonsense: true })).toMatchObject({
                ok: false,
                error: { code: 'bad-request' },
            });
        }
    });
});

describe('reading a curl command', () => {
    it('answers the request with the credential as it was written', async () => {
        const answer = await harness.ipc().call(CHANNELS.codegenFromCurl, {
            text: "curl https://x.test -H 'Authorization: Bearer abc'",
        });

        expect(answer).toMatchObject({
            ok: true,
            value: {
                kind: 'parsed',
                request: {
                    url: 'https://x.test',
                    headers: [{ key: 'Authorization', value: 'Bearer abc', enabled: true }],
                },
            },
        });
    });

    it('answers a command with no url as invalid, not as a failure', async () => {
        expect(await harness.ipc().call(CHANNELS.codegenFromCurl, { text: 'curl' })).toEqual({
            ok: true,
            value: { kind: 'invalid', reason: 'noUrl' },
        });
    });
});

describe('writing a request as code', () => {
    it('says which file a binary body left out of the snippet', async () => {
        const { leftOutFile } = await codeOf(
            harness.ipc(),
            { method: 'PUT', url: 'http://api.test/', body: { type: 'binary', file: 'a/b.png' } },
            'curl',
        );

        expect(leftOutFile).toBe('a/b.png');
    });

    it('asks curl to skip the certificate check when the request does', async () => {
        const base = createRequestItem({ name: 'Orders' });
        const { code } = await codeOf(
            harness.ipc(),
            { url: 'https://api.test/', settings: { ...base.settings, validateTls: false } },
            'curl',
        );

        expect(code).toMatch(/--insecure|\s-k\s/);
    });

    it('leaves out of curl what the app does by default, since the request never said it', async () => {
        const { code } = await codeOf(harness.ipc(), { url: 'https://api.test/' }, 'curl');

        expect(code).toBe("curl --url 'https://api.test/'");
    });

    it('writes python as a call to requests', async () => {
        const { code } = await codeOf(
            harness.ipc(),
            { url: 'http://api.test/' },
            'python-requests',
        );

        expect(code).toContain('requests.');
    });

    it('writes a variable nobody defined as the text it was written', async () => {
        const { code } = await codeOf(
            harness.ipc(),
            { url: 'http://api.test/{{nowhere}}' },
            'curl',
        );

        expect(code).toContain('nowhere');
    });

    it('refuses a GraphQL body a send would refuse', async () => {
        const answer = await harness.ipc().call(
            CHANNELS.codegenSnippet,
            payload({
                url: 'http://api.test/',
                body: { type: 'graphql', query: 'subscription { a }', variables: '' },
            }),
        );

        expect(answer).toMatchObject({ ok: false, error: { code: 'bad-request' } });
    });

    it('refuses while no origin is open', async () => {
        closeRepo();

        expect(
            await harness.ipc().call(CHANNELS.codegenSnippet, payload({ url: 'http://api.test/' })),
        ).toMatchObject({ ok: false });
    });
});
