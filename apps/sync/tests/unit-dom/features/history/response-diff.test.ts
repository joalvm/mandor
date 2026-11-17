import { describe, expect, it } from 'vitest';

import { responseDiff } from '../../../../src/renderer/features/history/lib/response-diff.js';
import { httpResponseWith } from '../../support/http-response.js';

function timed(totalMs: number) {
    return {
        connectMs: 10,
        dnsMs: 5,
        firstByteMs: 40,
        tlsMs: 20,
        totalMs,
        viaProxy: false,
    };
}

describe('comparing two responses', () => {
    it('sets the status, version, time and size side by side', () => {
        const diff = responseDiff(
            httpResponseWith({ status: 200 }),
            httpResponseWith({
                httpVersion: '2',
                sizes: { bodyBytes: 4000, decoded: true, transferredBytes: 900 },
                status: 404,
                timings: timed(250),
            }),
        );

        expect(diff.facts).toEqual([
            { after: 404, before: 200, key: 'status', same: false },
            { after: '2', before: '1.1', key: 'version', same: false },
            { after: 250, before: 100, key: 'totalMs', same: false },
            { after: 4000, before: 3100, key: 'bodyBytes', same: false },
        ]);
    });

    it('marks each fact that did not move as the same', () => {
        const response = httpResponseWith();

        expect(responseDiff(response, response).facts.every((fact) => fact.same)).toBe(true);
    });

    it('carries the comparison of the headers and of the body', () => {
        const diff = responseDiff(
            httpResponseWith({ headers: [['x-a', '1']] }),
            httpResponseWith({ headers: [['x-a', '2']] }),
        );

        expect(diff.headers).toEqual([
            { after: ['2'], before: ['1'], change: 'changed', name: 'x-a' },
        ]);
        expect(diff.body).toEqual({ kind: 'empty' });
    });
});
