import { describe, expect, it } from 'vitest';

import { followRedirects } from '../../src/redirect/follow-redirects.js';
import type { CrossOriginGuard, SyncRequest } from '../../src/request/sync-request.js';
import type { SyncResponse } from '../../src/response/sync-response.js';
import { at, headerOf, request, response } from '../support/cookie-fixtures.js';

const GUARD: CrossOriginGuard = {
    headers: ['X-Api-Key', 'Authorization'],
    bodySecret: false,
    spellings: ['tok_123'],
};

const HEADERS: [string, string][] = [
    ['x-api-key', 'tok_123'],
    ['Authorization', 'Bearer tok_123'],
    ['accept', 'application/json'],
];

/** Sends the request through a 3xx to `to` and a 200, and keeps what each hop sent. */
async function through(
    first: SyncRequest,
    status: number,
    to: string,
): Promise<{ seen: SyncRequest[]; outcome: Awaited<ReturnType<typeof followRedirects>> }> {
    const seen: SyncRequest[] = [];
    const answers: SyncResponse[] = [response(status, [['location', to]]), response(200)];
    const outcome = await followRedirects(first, (one) => {
        seen.push(one);

        return Promise.resolve(at(answers, seen.length - 1));
    });

    return { seen, outcome };
}

function guarded(
    overrides: Partial<CrossOriginGuard> = {},
    init: Partial<SyncRequest> = {},
): SyncRequest {
    return request('https://api.test/one', {
        headers: HEADERS,
        ...init,
        redirects: {
            follow: true,
            max: 5,
            keepAuthorization: true,
            crossOriginGuard: { ...GUARD, ...overrides },
        },
    });
}

describe('followRedirects with the guard of a send a script shaped', () => {
    it('takes every line along to another origin without a guard, as today', async () => {
        const { seen, outcome } = await through(
            request('https://api.test/one', {
                headers: HEADERS,
                redirects: { follow: true, max: 5, keepAuthorization: true },
            }),
            307,
            'https://evil.test/two',
        );

        expect(headerOf(at(seen, 1), 'x-api-key')).toBe('tok_123');
        expect(outcome.hops[0]?.strippedHeaders).toEqual([]);
        expect(outcome).not.toHaveProperty('heldAt');
    });

    it('drops the secret lines on a hop to another origin, Authorization although kept, and goes on', async () => {
        const { seen, outcome } = await through(guarded(), 302, 'https://evil.test/two');

        expect(at(seen, 1).headers).toEqual([['accept', 'application/json']]);
        expect(outcome.hops[0]?.strippedHeaders).toEqual(['x-api-key', 'authorization']);
        expect(outcome.response.status).toBe(200);
    });

    it('drops nothing on a hop to the same origin', async () => {
        const { seen } = await through(guarded(), 307, 'https://api.test/two');

        expect(at(seen, 1).headers).toEqual(HEADERS);
    });

    it('answers the 3xx when the hop would carry a body with a secret elsewhere', async () => {
        const body = new TextEncoder().encode('tok_123');
        const { seen, outcome } = await through(
            guarded({ bodySecret: true }, { method: 'POST', body }),
            307,
            'https://evil.test/two',
        );

        expect(seen).toHaveLength(1);
        expect(outcome.response.status).toBe(307);
        expect(outcome.heldAt).toBe('https://api.test/one');
    });

    it('goes on when the hop drops the body: a 302 after a POST turns into a GET', async () => {
        const body = new TextEncoder().encode('tok_123');
        const { seen } = await through(
            guarded({ bodySecret: true }, { method: 'POST', body }),
            302,
            'https://evil.test/two',
        );

        expect(at(seen, 1)).toMatchObject({ method: 'GET', body: undefined });
        expect(headerOf(at(seen, 1), 'x-api-key')).toBeUndefined();
    });

    it('answers the 3xx when the location holds a form of a secret', async () => {
        const { seen, outcome } = await through(guarded(), 302, 'https://evil.test/?k=tok_123');

        expect(seen).toHaveLength(1);
        expect(outcome.heldAt).toBe('https://api.test/one');
    });

    it('follows a 307 whose body carries no secret, body and all', async () => {
        const body = new TextEncoder().encode('plain');
        const { seen } = await through(
            guarded({ spellings: [''] }, { method: 'POST', body }),
            307,
            'https://evil.test/two',
        );

        expect(at(seen, 1).body).toBe(body);
    });
});
