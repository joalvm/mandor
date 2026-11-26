import { createRequestItem } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    dispatchItem,
    type DispatchContext,
    type DispatchInput,
} from '../../../../src/main/request/dispatch-item.js';
import type { SentRequest } from '../../../../src/main/request/send-event.js';
import { BIG, startSendFixture, type SendFixture } from './support/send-fixture.js';

let fixture: SendFixture;

beforeEach(async () => {
    fixture = await startSendFixture();
});

afterEach(async () => {
    await fixture.stop();
});

function inputOf(request: Partial<DispatchInput['request']>): DispatchInput {
    return {
        workspaceId: 'payments',
        itemPath: 'orders/list',
        environmentId: 'local',
        request: { ...createRequestItem({ name: 'Echo' }), ...request },
    };
}

function contextOf(onSent?: (sent: SentRequest) => void): DispatchContext {
    return {
        place: { root: fixture.root, repo: 'demo', readSecret: () => Promise.resolve(null) },
        networkFor: () => Promise.resolve({ tls: {} }),
        onSent,
    };
}

const SIGNAL = new AbortController().signal;

describe('taking a request from its variables to the wire', () => {
    it('resolves the environment, sends and hands back the response with the type of the body', async () => {
        const answer = await dispatchItem(
            contextOf(),
            inputOf({
                method: 'POST',
                url: '{{baseUrl}}/echo',
                body: { type: 'json', content: '{"a":1}' },
            }),
            {},
            SIGNAL,
        );

        expect(answer).toMatchObject({
            ok: true,
            value: {
                bodyType: 'json',
                response: { status: 200 },
                url: expect.stringMatching(/^http:\/\/[^{}]+\/echo$/),
            },
        });
        expect(fixture.received[0]).toMatchObject({ method: 'POST', body: '{"a":1}' });
    });

    it('answers the Digest challenge of the server and sends the request again', async () => {
        const answer = await dispatchItem(
            contextOf(),
            inputOf({
                url: '{{baseUrl}}/digest',
                auth: { type: 'digest', username: 'ana', password: 'secret' },
            }),
            {},
            SIGNAL,
        );

        expect(answer).toMatchObject({ ok: true, value: { response: { status: 200 } } });
        expect(fixture.received.map((one) => one.headers.authorization)).toEqual([
            undefined,
            expect.stringMatching(/^Digest username="ana", realm="r", nonce="n", uri="\/digest"/),
        ]);
    });

    /** A client certificate and a proxy are chosen by host: the url a redirect lands on chooses again. */
    it('asks how each url of a redirect reaches the network', async () => {
        const asked: string[] = [];
        const answer = await dispatchItem(
            {
                ...contextOf(),
                networkFor: (url) => {
                    asked.push(new URL(url).pathname);

                    return Promise.resolve({ tls: {} });
                },
            },
            inputOf({ url: '{{baseUrl}}/redirect' }),
            {},
            SIGNAL,
        );

        expect(answer).toMatchObject({ ok: true, value: { response: { status: 200 } } });
        expect(asked).toEqual(['/redirect', '/echo']);
    });

    it('signs the request with AWS Signature Version 4', async () => {
        await dispatchItem(
            contextOf(),
            inputOf({
                url: '{{baseUrl}}/echo',
                auth: {
                    type: 'awsv4',
                    accessKeyId: 'AK',
                    secretAccessKey: 'SK',
                    region: 'eu-west-1',
                    service: 'execute-api',
                },
            }),
            {},
            SIGNAL,
        );

        expect(fixture.received[0]?.headers['x-amz-date']).toMatch(/^\d{8}T\d{6}Z$/);
        expect(fixture.received[0]?.headers.authorization).toMatch(
            /^AWS4-HMAC-SHA256 Credential=AK\/\d{8}\/eu-west-1\/execute-api\/aws4_request, /,
        );
    });

    // As Postman does: the url goes as it was typed, and the network says what is wrong with it.
    it('sends a url left with its variable as it is, and no server of it ever answers', async () => {
        await expect(
            dispatchItem(contextOf(), inputOf({ url: '{{nowhere}}/echo' }), {}, SIGNAL),
        ).rejects.toThrow(/\{\{nowhere\}\}/u);
        expect(fixture.received).toEqual([]);
    });

    it('says what is about to leave before it does', async () => {
        const told: SentRequest[] = [];

        await dispatchItem(
            contextOf((sent) => told.push(sent)),
            inputOf({
                method: 'POST',
                url: '{{baseUrl}}/echo',
                body: { type: 'text', content: 'hi' },
            }),
            {},
            SIGNAL,
        );

        expect(told).toHaveLength(1);
        expect(told[0]).toMatchObject({ method: 'POST', url: `${fixture.origin}/echo` });
        expect(new TextDecoder().decode(told[0]?.bytes)).toBe('hi');
    });

    it('sends the body and the method a caller overrides, and not the ones on screen', async () => {
        const answer = await dispatchItem(
            contextOf(),
            inputOf({ method: 'GET', url: '{{baseUrl}}/echo', body: { type: 'none' } }),
            { method: 'POST', body: { type: 'graphql', query: '{ a }', variables: '' } },
            SIGNAL,
        );

        expect(answer).toMatchObject({ ok: true, value: { bodyType: 'graphql' } });
        expect(fixture.received[0]).toMatchObject({
            method: 'POST',
            body: JSON.stringify({ query: '{ a }' }),
        });
        expect(fixture.received[0]?.headers['content-type']).toBe('application/json');
    });

    it('keeps a body in memory up to the threshold a caller sets', async () => {
        const answer = await dispatchItem(
            contextOf(),
            inputOf({ url: '{{baseUrl}}/big' }),
            { spillThresholdBytes: BIG.length + 1 },
            SIGNAL,
        );

        expect(answer).toMatchObject({
            ok: true,
            value: { response: { body: { kind: 'inline' } } },
        });
    });
});
