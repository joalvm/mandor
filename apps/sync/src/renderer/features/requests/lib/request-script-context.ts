import type { ListedVariable } from '@mandor/env';
import type { HttpResponse, RequestExample, RequestLine } from '@mandor/schema';
import { sampleOf, sentHeaderNames, type ScriptContext } from '@mandor/script';

import type { SendEntry } from '../responses.slice.js';

/** What a place of Request knows that the editor of its scripts completes with. */
export type RequestScriptPlace = {
    /** The first example of the request, the answer somebody wrote down. */
    example?: RequestExample | undefined;
    headers?: readonly RequestLine[] | undefined;
    /** The answer of the last send that came back. */
    response?: HttpResponse | undefined;
    /** What the place resolves and its scripts declare, a secret already masked. */
    variables: readonly ListedVariable[];
};

/** The answer of the last send, once one came back. */
export function answerOf(entry: SendEntry): HttpResponse | undefined {
    if (entry.state !== 'done') {
        return undefined;
    }

    return entry.response;
}

/** The text of an answer while it stays in memory as text; a stored or binary one is no sample. */
function textOf(response: HttpResponse | undefined): string | undefined {
    const body = response?.body;

    if (body?.kind !== 'inline' || body.encoding !== 'utf8') {
        return undefined;
    }

    return body.text;
}

/**
 * The context of the scripts of a request or a group: the variables it resolves and its scripts
 * declare; the names of the headers it sends, switched on; and as a sample, the example somebody
 * wrote down, or else the last answer, when either is JSON.
 */
export function requestScriptContextOf(place: RequestScriptPlace): ScriptContext {
    return {
        headers: sentHeaderNames(place.headers ?? []),
        sample: sampleOf(place.example?.body) ?? sampleOf(textOf(place.response)),
        variables: place.variables,
    };
}
