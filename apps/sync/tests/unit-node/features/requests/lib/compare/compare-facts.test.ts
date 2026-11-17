import type { RequestExample, ResponseCookie } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { compareFacts } from '../../../../../../src/renderer/features/requests/lib/compare/compare-facts.js';
import { httpResponseWith } from '../../../../../unit-dom/support/http-response.js';

const EXAMPLE: RequestExample = {
    body: '',
    contentType: 'text/plain',
    name: 'Creado',
    status: '200',
};

function cookie(name: string, value: string): ResponseCookie {
    return { httpOnly: false, name, secure: false, value };
}

function factsOf(
    declared: Pick<RequestExample, 'cookies' | 'headers'>,
    came: { cookies?: ResponseCookie[]; headers?: [string, string][] },
) {
    return compareFacts({ ...EXAMPLE, ...declared }, httpResponseWith(came));
}

describe('what an example declares of its answer, against what came (compareFacts)', () => {
    it('declares nothing when it has no headers and no cookies', () => {
        expect(factsOf({}, { cookies: [cookie('a', '1')], headers: [['x-a', '1']] })).toEqual([]);
    });

    it('says a header that came with another value, whatever the case of its name', () => {
        expect(
            factsOf(
                { headers: [['Content-Type', 'text/plain']] },
                { headers: [['content-type', 'text/html']] },
            ),
        ).toEqual([
            { expected: 'text/plain', kind: 'header', name: 'content-type', received: 'text/html' },
        ]);
    });

    it('says a header that did not come', () => {
        expect(factsOf({ headers: [['x-a', '1']] }, { headers: [] })).toEqual([
            { expected: '1', kind: 'header', name: 'x-a', received: undefined },
        ]);
    });

    it('takes what the server adds as no promise of the example', () => {
        const came: [string, string][] = [
            ['X-A', '1'],
            ['x-b', '2'],
        ];

        expect(factsOf({ headers: [['x-a', '1']] }, { headers: came })).toEqual([]);
    });

    it('reads a repeated header as all its values at once', () => {
        const repeated: [string, string][] = [
            ['vary', 'a'],
            ['vary', 'b'],
        ];

        expect(factsOf({ headers: repeated }, { headers: repeated })).toEqual([]);
        expect(factsOf({ headers: repeated }, { headers: [['vary', 'a']] })).toEqual([
            { expected: 'a, b', kind: 'header', name: 'vary', received: 'a' },
        ]);
    });

    it.each([
        'age',
        'cf-ray',
        'content-length',
        'date',
        'ETag',
        'expires',
        'last-modified',
        'ratelimit-reset',
        'request-id',
        'retry-after',
        'server-timing',
        'set-cookie',
        'traceparent',
        'tracestate',
        'x-amzn-requestid',
        'x-amzn-trace-id',
        'x-b3-traceid',
        'x-cloud-trace-context',
        'x-correlation-id',
        'x-ratelimit-remaining',
        'x-request-id',
        'x-response-time',
        'x-runtime',
        'x-trace-id',
    ])('sets %s aside: it changes from one send to the next', (name) => {
        expect(factsOf({ headers: [[name, '1']] }, { headers: [[name, '2']] })).toEqual([]);
        expect(factsOf({ headers: [[name, '1']] }, { headers: [] })).toEqual([]);
    });

    it('asks of a cookie only that it came', () => {
        const declared = { cookies: [cookie('session', 'old'), cookie('theme', 'dark')] };

        expect(factsOf(declared, { cookies: [cookie('session', 'new')] })).toEqual([
            { expected: 'dark', kind: 'cookie', name: 'theme', received: undefined },
        ]);
    });
});
