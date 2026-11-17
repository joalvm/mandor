import type { HttpResponse, RequestExample } from '@mandor/schema';

/** One thing the example declares about the answer, and what came of it. */
export type FactDifference = {
    expected: string;
    kind: 'cookie' | 'header';
    name: string;
    /** What came instead; nothing when it did not come at all. */
    received: string | undefined;
};

type HeaderPairs = readonly (readonly [string, string])[];

/** Headers that change from one send to the next: a difference in them says nothing. */
const VOLATILE_HEADERS: ReadonlySet<string> = new Set([
    'age',
    'cf-ray',
    'content-length',
    'date',
    'etag',
    'expires',
    'last-modified',
    'request-id',
    'retry-after',
    'server-timing',
    'set-cookie',
    'traceparent',
    'tracestate',
    'x-amzn-requestid',
    'x-amzn-trace-id',
    'x-cloud-trace-context',
    'x-correlation-id',
    'x-request-id',
    'x-response-time',
    'x-runtime',
    'x-trace-id',
]);

/** Families of them, named by what they start with. */
const VOLATILE_FAMILIES = /^(?:(?:x-)?ratelimit|x-b3-)/;

function isVolatile(name: string): boolean {
    return VOLATILE_HEADERS.has(name) || VOLATILE_FAMILIES.test(name);
}

/** Names as HTTP reads them, without case; a repeated header says all of its values at once. */
function byName(headers: HeaderPairs): Map<string, string> {
    const values = new Map<string, string>();

    for (const [name, value] of headers) {
        const key = name.toLowerCase();
        const earlier = values.get(key);

        values.set(key, earlier === undefined ? value : `${earlier}, ${value}`);
    }

    return values;
}

function headerDifferences(expected: HeaderPairs, received: HeaderPairs): FactDifference[] {
    const came = byName(received);

    return [...byName(expected)]
        .filter(([name, value]) => !isVolatile(name) && came.get(name) !== value)
        .map(([name, value]) => ({
            expected: value,
            kind: 'header',
            name,
            received: came.get(name),
        }));
}

/** A cookie either came or did not: the value of a session is another one on every send. */
function cookieDifferences(
    expected: NonNullable<RequestExample['cookies']>,
    received: HttpResponse['cookies'],
): FactDifference[] {
    const came = new Set(received.map((cookie) => cookie.name));

    return expected
        .filter((cookie) => !came.has(cookie.name))
        .map((cookie) => ({
            expected: cookie.value,
            kind: 'cookie',
            name: cookie.name,
            received: undefined,
        }));
}

/**
 * What the example declares of the headers and cookies of its answer, against what came. Only
 * what it declares: whatever else the server adds is no promise the example made, so deleting a
 * line by hand is how a person says it does not matter.
 */
export function compareFacts(example: RequestExample, response: HttpResponse): FactDifference[] {
    return [
        ...headerDifferences(example.headers ?? [], response.headers),
        ...cookieDifferences(example.cookies ?? [], response.cookies),
    ];
}
