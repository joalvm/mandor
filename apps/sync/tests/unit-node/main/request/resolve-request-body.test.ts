import { rm } from 'node:fs/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { resolveRequest } from '../../../../src/main/request/resolve-request.js';
import {
    DIRECT_NETWORK,
    line,
    placeOf,
    repoWithEnvironment,
    sendInput,
} from './support/resolve-fixture.js';

let root: string;

beforeEach(async () => {
    root = await repoWithEnvironment();
});

afterEach(async () => {
    await rm(root, { recursive: true, force: true });
});

function place(secret: string | null = null) {
    return placeOf(root, secret);
}

const input = sendInput;

describe('resolving the body and the settings of a request', () => {
    it('resolves the body, field by field', async () => {
        const json = await resolveRequest(
            place(),
            input({ url: 'http://a.test/', body: { type: 'json', content: '{"p":{{page}}}' } }),
            { networkFor: DIRECT_NETWORK },
        );
        const form = await resolveRequest(
            place(),
            input({
                url: 'http://a.test/',
                body: {
                    type: 'form',
                    fields: [
                        { ...line('n', '{{page}}'), kind: 'text' },
                        { ...line('f', 'a/{{page}}.bin'), kind: 'file' },
                    ],
                },
            }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(json).toMatchObject({ value: { body: { type: 'json', content: '{"p":2}' } } });
        expect(form).toMatchObject({
            value: {
                body: {
                    type: 'form',
                    fields: [
                        { key: 'n', value: '2', kind: 'text' },
                        { key: 'f', value: 'a/2.bin', kind: 'file' },
                    ],
                },
            },
        });
    });

    it('turns the settings of the request into what the transport asks for', async () => {
        const result = await resolveRequest(
            place(),
            input({
                url: 'http://a.test/',
                settings: {
                    timeoutMs: 4000,
                    followRedirects: false,
                    maxRedirects: 3,
                    validateTls: false,
                },
            }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({
            value: {
                timeouts: { connectMs: 4000, totalMs: 4000 },
                redirects: { follow: false, max: 3 },
                tls: { verify: false },
            },
        });
    });

    it('never waits more than ten seconds to connect', async () => {
        const result = await resolveRequest(
            place(),
            input({
                url: 'http://a.test/',
                settings: {
                    timeoutMs: 60000,
                    followRedirects: true,
                    maxRedirects: 5,
                    validateTls: true,
                },
            }),
            { networkFor: DIRECT_NETWORK },
        );

        expect(result).toMatchObject({ value: { timeouts: { connectMs: 10000, totalMs: 60000 } } });
    });
});
