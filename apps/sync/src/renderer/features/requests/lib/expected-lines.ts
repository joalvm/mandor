import type { KeyValueLine } from '@mandor/env';
import type { RequestExample, ResponseCookie } from '@mandor/schema';

/** What an example declares of its answer, as a table of pairs shows it. */
export type ExpectedPair = [name: string, value: string];

export function expectedHeadersOf(example: RequestExample): readonly ExpectedPair[] {
    return example.headers ?? [];
}

export function expectedCookiesOf(example: RequestExample): readonly ExpectedPair[] {
    return (example.cookies ?? []).map((cookie) => [cookie.name, cookie.value]);
}

/** The example declaring these headers; with none, it says nothing of them. */
export function withExpectedHeaders(
    example: RequestExample,
    pairs: readonly ExpectedPair[],
): RequestExample {
    const next: RequestExample = { ...example, headers: [...pairs] };

    if (pairs.length === 0) {
        delete next.headers;
    }

    return next;
}

function cookieOf(pair: ExpectedPair, kept: readonly ResponseCookie[]): ResponseCookie {
    const [name, value] = pair;
    const known = kept.find((cookie) => cookie.name === name);

    return { httpOnly: false, secure: false, ...known, name, value };
}

/** The example declaring these cookies, each with the attributes it already had under its name. */
export function withExpectedCookies(
    example: RequestExample,
    pairs: readonly ExpectedPair[],
): RequestExample {
    const kept = example.cookies ?? [];
    const next: RequestExample = {
        ...example,
        cookies: pairs.map((pair) => cookieOf(pair, kept)),
    };

    if (pairs.length === 0) {
        delete next.cookies;
    }

    return next;
}

export function linesOfPairs(pairs: readonly ExpectedPair[]): KeyValueLine[] {
    return pairs.map(([name, value], at) => ({
        disabled: false,
        id: String(at),
        name,
        value,
    }));
}

/** A line with no name yet declares nothing: it stays on the table and out of the example. */
export function pairsOfLines(lines: readonly KeyValueLine[]): ExpectedPair[] {
    return lines.filter((line) => line.name.trim() !== '').map((line) => [line.name, line.value]);
}

export function samePairs(left: readonly ExpectedPair[], right: readonly ExpectedPair[]): boolean {
    return (
        left.length === right.length &&
        left.every(([name, value], at) => right[at]?.[0] === name && right[at][1] === value)
    );
}
