import { rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { REDACTED } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ResolvedRequest } from '../../../../src/main/request/resolved-request.js';
import { resolvedRequestOf } from '../../../../src/main/request/resolve-request.js';
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

function resolve(
    request: Parameters<typeof sendInput>[0],
    tokens: 'fetch' | 'placeholder' = 'fetch',
) {
    return resolvedRequestOf(placeOf(root, 's3cr3t'), sendInput(request), {
        signal: new AbortController().signal,
        tokens,
        networkFor: DIRECT_NETWORK,
    });
}

function valueOf(result: Awaited<ReturnType<typeof resolve>>): ResolvedRequest {
    if (!result.ok) {
        throw new Error(result.error.message);
    }

    return result.value;
}

describe('resolving a request before it becomes bytes or code', () => {
    it('resolves the url, a header and the body against the environment', async () => {
        const resolved = valueOf(
            await resolve({
                method: 'post',
                url: '{{baseUrl}}/orders',
                headers: [line('X-Page', '{{page}}')],
                body: { type: 'json', content: '{"page":{{page}}}' },
            }),
        );

        expect(resolved).toMatchObject({
            method: 'POST',
            url: 'http://api.test/orders',
            headers: [['X-Page', '2']],
            body: { type: 'json', content: '{"page":2}' },
        });
    });

    it('leaves out the rows that are switched off', async () => {
        const resolved = valueOf(
            await resolve({
                url: 'http://api.test/',
                query: [line('off', '1', false)],
                headers: [line('X-Off', '1', false)],
            }),
        );

        expect(resolved).toMatchObject({ url: 'http://api.test/', headers: [] });
    });

    it('carries the settings the request overrides', async () => {
        const resolved = valueOf(
            await resolve({ url: 'http://api.test/', settings: { validateTls: false } }),
        );

        expect(resolved.settings).toEqual({ validateTls: false });
    });

    it('keeps a variable nobody defined as the text it was written', async () => {
        const resolved = valueOf(await resolve({ url: 'http://api.test/{{nowhere}}' }));

        expect(resolved.url).toContain('nowhere');
    });

    it('leaves the signature of digest to the send, its credentials resolved', async () => {
        const resolved = valueOf(
            await resolve({
                url: 'http://api.test/',
                auth: { type: 'digest', username: 'ana', password: '{{baseUrl}}' },
            }),
        );

        expect(resolved.headers).toEqual([]);
        expect(resolved.signing).toEqual({
            scheme: 'digest',
            username: 'ana',
            password: 'http://api.test',
        });
    });

    it('asks for no token when the caller wants a placeholder, and does when it wants one', async () => {
        await writeFile(
            join(root, 'workspaces', 'payments', 'workspace.yaml'),
            [
                'name: Payments',
                'kind: sync',
                'id: payments',
                'auth:',
                '  type: oauth2-client-credentials',
                '  tokenUrl: "http://127.0.0.1:1/token"',
                '  clientId: client',
                '  clientSecret: shh',
                '  clientAuth: basic',
                '',
            ].join('\n'),
            'utf8',
        );

        const placeholder = valueOf(await resolve({ url: 'http://api.test/' }, 'placeholder'));

        expect(placeholder.headers).toEqual([['Authorization', `Bearer ${REDACTED}`]]);
        // Nothing listens on the port of the token url: asking for the token cannot succeed.
        await expect(resolve({ url: 'http://api.test/' }, 'fetch')).rejects.toThrow();
    });
});
