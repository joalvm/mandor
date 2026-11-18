import type { RequestExample, RequestLine } from '@mandor/schema';

import { statusMatches } from './compare-status.js';

/** An example a response may stand for, with the key that names it among those of its request. */
export type AnsweringExample = { example: RequestExample; key: string };

type Fit<A> = { answer: A; at: number; matches: number; misses: number; reach: number };

// From the narrowest status to the widest: a code only itself, a family its hundred, `default` any.
const REACH: RegExp[] = [/^\d{3}$/u, /^[1-5]XX$/iu, /^default$/iu];

function reachOf(status: string): number {
    const at = REACH.findIndex((shape) => shape.test(status));

    return at === -1 ? REACH.length : at;
}

/** The lines that count: switched on and with a key. */
function liveLines(lines: readonly RequestLine[] | undefined): RequestLine[] {
    return (lines ?? []).filter((line) => line.enabled && line.key.trim() !== '');
}

/** The values sent under each key; a key may go more than once. */
function sentValues(lines: readonly RequestLine[] | undefined): Map<string, string[]> {
    const values = new Map<string, string[]>();

    for (const line of liveLines(lines)) {
        values.set(line.key, [...(values.get(line.key) ?? []), line.value]);
    }

    return values;
}

/** A value with a variable in it stands for any value: what it resolves to is not on the example. */
function agrees(pinned: string, sent: string): boolean {
    return pinned.includes('{{') || sent.includes('{{') || pinned === sent;
}

function fitOf<A extends AnsweringExample>(
    answer: A,
    at: number,
    sent: Map<string, string[]>,
): Fit<A> {
    const pinned = liveLines(answer.example.request?.query);
    const matches = pinned.filter((line) =>
        (sent.get(line.key) ?? []).some((value) => agrees(line.value, value)),
    ).length;

    return {
        answer,
        at,
        matches,
        misses: pinned.length - matches,
        reach: reachOf(answer.example.status),
    };
}

function byFit<A>(one: Fit<A>, other: Fit<A>): number {
    return (
        one.misses - other.misses ||
        other.matches - one.matches ||
        one.reach - other.reach ||
        one.at - other.at
    );
}

/**
 * The examples of a request a response may stand for, best first: those whose status covers the
 * one that came, ordered by how well the params they pin agree with the ones sent. A pinned param
 * not sent, or sent with another value, counts against; one that agrees counts for. Then the
 * narrower status wins, then the order of the file. Two examples of one status answer with
 * different shapes when their params ask for them — `fields=id,name`, `paginate=true` — and the
 * params sent tell which one the answer is.
 */
export function answeringExamples<A extends AnsweringExample>(
    answers: readonly A[],
    status: number,
    sent: readonly RequestLine[] | undefined,
): A[] {
    const values = sentValues(sent);

    return answers
        .filter(({ example }) => statusMatches(example.status, status))
        .map((answer) => fitOf(answer, answers.indexOf(answer), values))
        .sort(byFit)
        .map(({ answer }) => answer);
}
