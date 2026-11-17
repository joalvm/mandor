import type { SnippetBody, SnippetRequest } from '@mandor/codegen';
import { graphqlPayload } from '@mandor/graphql';
import { bodyContentType } from '@mandor/schema';
import { compactJson } from '@mandor/validate';

import type { ResolvedBody, ResolvedBodyOf } from '../request/request-templates.js';
import type { ResolvedRequest } from '../request/resolved-request.js';

/** The content type a snippet declares: the one the user wrote, or the one the body implies. */
function contentTypeOf(resolved: ResolvedRequest): string {
    const written = resolved.headers.find(([name]) => name.toLowerCase() === 'content-type');

    return written?.[1] ?? bodyContentType(resolved.body) ?? 'text/plain';
}

function noSnippetBody(): SnippetBody {
    return { type: 'none' };
}

function contentSnippet(
    body: ResolvedBodyOf<'text' | 'xml'>,
    resolved: ResolvedRequest,
): SnippetBody {
    return { type: 'text', contentType: contentTypeOf(resolved), text: body.content };
}

/**
 * A JSON body as a send puts it on the wire — the comments and the trailing commas of the editor
 * left behind — and on one line, so the code carries no break nor indent the server never reads.
 */
function jsonSnippet(body: ResolvedBodyOf<'json'>, resolved: ResolvedRequest): SnippetBody {
    return { type: 'text', contentType: contentTypeOf(resolved), text: compactJson(body.content) };
}

/** Each type of body as the library writes it. A file sent whole does not travel in a snippet. */
const SNIPPET_BODY_OF_TYPE: {
    [T in ResolvedBody['type']]: (
        body: ResolvedBodyOf<T>,
        resolved: ResolvedRequest,
    ) => SnippetBody;
} = {
    binary: noSnippetBody,
    form: (body) => ({
        type: 'form',
        fields: body.fields.map(({ key, value, kind }) => ({ name: key, value, kind })),
    }),
    graphql: (body, resolved) => ({
        type: 'text',
        contentType: contentTypeOf(resolved),
        text: graphqlPayload(body),
    }),
    json: jsonSnippet,
    none: noSnippetBody,
    text: contentSnippet,
    urlencoded: (body) => ({ type: 'urlencoded', fields: body.fields }),
    xml: contentSnippet,
};

function snippetBodyIn<T extends ResolvedBody['type']>(
    type: T,
    body: ResolvedBodyOf<T>,
    resolved: ResolvedRequest,
): SnippetBody {
    return SNIPPET_BODY_OF_TYPE[type](body, resolved);
}

function bodyOf(resolved: ResolvedRequest): SnippetBody {
    return snippetBodyIn(resolved.body.type, resolved.body, resolved);
}

function leftOutFileOf(body: ResolvedBody): string | null {
    if (body.type !== 'binary') {
        return null;
    }

    return body.file;
}

/**
 * The request of the window as a snippet is written: its body as the library knows it. A file
 * sent as the whole body does not travel in a snippet, so it is named apart for the window to say
 * so. A GraphQL body the send would refuse throws the same error the send throws.
 */
export function snippetRequestOf(resolved: ResolvedRequest): {
    request: SnippetRequest;
    leftOutFile: string | null;
} {
    const { method, url, headers, body } = resolved;

    return {
        request: { method, url, headers, body: bodyOf(resolved) },
        leftOutFile: leftOutFileOf(body),
    };
}
