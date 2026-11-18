import type { ChainSnapshot } from '@mandor/host';
import {
    inheritedHeaders,
    type FolderChainLevel,
    type RequestBody,
    type RequestBodyOf,
    type RequestLine,
} from '@mandor/schema';

import type { AppliedEffects } from './apply-script-effects.js';

type RequestPhoto = NonNullable<ChainSnapshot['request']>;

type Line = RequestPhoto['headers'][number];

/** The body a script reads as text; another kind shows only its type, and none of what it holds. */
const TEXT_OF_BODY: { [T in RequestBody['type']]: (body: RequestBodyOf<T>) => string } = {
    json: (body) => body.content,
    text: (body) => body.content,
    xml: (body) => body.content,
    none: () => '',
    urlencoded: () => '',
    form: () => '',
    binary: () => '',
    graphql: () => '',
};

function textOf<T extends RequestBody['type']>(type: T, body: RequestBodyOf<T>): string {
    return TEXT_OF_BODY[type](body);
}

function linesOf(lines: readonly RequestLine[]): Line[] {
    return lines
        .filter((line) => line.enabled && line.key !== '')
        .map((line) => ({ name: line.key, value: line.value }));
}

/**
 * The headers that leave once the inherited lines are merged and the ones a script deleted are
 * out. Main sends with it and a script reads it, so both see the same list.
 */
export function sentHeaders(
    chain: readonly FolderChainLevel[],
    applied: Pick<AppliedEffects, 'request' | 'droppedHeaders'>,
): RequestLine[] {
    return inheritedHeaders(chain, applied.request.headers).sent.filter(
        (line) => !applied.droppedHeaders.has(line.key.toLowerCase()),
    );
}

/**
 * The request as a script sees it: the templates as written, `{{var}}` literal, the headers it
 * inherits beside its own, and no auth and no settings. A body that is not text shows its type
 * alone.
 */
export function requestPhoto(
    chain: readonly FolderChainLevel[],
    applied: Pick<AppliedEffects, 'request' | 'droppedHeaders'>,
): RequestPhoto {
    const { request } = applied;

    return {
        url: request.url,
        method: request.method,
        headers: linesOf(sentHeaders(chain, applied)),
        query: linesOf(request.query),
        body: { type: request.body.type, text: textOf(request.body.type, request.body) },
    };
}
