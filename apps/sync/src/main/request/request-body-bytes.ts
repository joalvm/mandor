import { basename } from 'node:path';

import { graphqlPayload } from '@mandor/graphql';
import { bodyContentType } from '@mandor/schema';

import { readRepoFile } from './repo-file.js';
import type { ResolvedBody, ResolvedBodyOf } from './request-templates.js';

type Header = readonly [string, string];

/** What goes on the wire for the body, and the headers once the type it implies is added. */
export type BodyBytes = { bytes: Uint8Array | undefined; headers: Header[] };

type Encoded = { bytes: Uint8Array | undefined; contentType?: string | undefined };

async function formOf(root: string, body: ResolvedBodyOf<'form'>): Promise<Encoded> {
    const data = new FormData();

    for (const field of body.fields) {
        if (field.kind === 'file') {
            const bytes = await readRepoFile(root, field.value);

            data.append(field.key, new File([new Uint8Array(bytes)], basename(field.value)));
        } else {
            data.append(field.key, field.value);
        }
    }

    const response = new Response(data);

    return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        contentType: response.headers.get('content-type') ?? undefined,
    };
}

/** A body written as text: its utf-8, under the type the body implies. */
function textOf(body: ResolvedBody, text: string): Encoded {
    return {
        bytes: new TextEncoder().encode(text),
        contentType: bodyContentType(body) ?? undefined,
    };
}

function contentOf(_root: string, body: ResolvedBodyOf<'json' | 'text' | 'xml'>): Encoded {
    return textOf(body, body.content);
}

/** Each type of body as bytes. A file is read from the repo as it is, with no type of its own. */
const BYTES_OF_TYPE: {
    [T in ResolvedBody['type']]: (
        root: string,
        body: ResolvedBodyOf<T>,
    ) => Encoded | Promise<Encoded>;
} = {
    binary: async (root, body) => ({ bytes: await readRepoFile(root, body.file) }),
    form: formOf,
    graphql: (_root, body) => textOf(body, graphqlPayload(body)),
    json: contentOf,
    none: () => ({ bytes: undefined }),
    text: contentOf,
    urlencoded: (_root, body) => textOf(body, new URLSearchParams(body.fields).toString()),
    xml: contentOf,
};

function bytesIn<T extends ResolvedBody['type']>(
    type: T,
    root: string,
    body: ResolvedBodyOf<T>,
): Encoded | Promise<Encoded> {
    return BYTES_OF_TYPE[type](root, body);
}

function bytesOf(root: string, body: ResolvedBody): Encoded | Promise<Encoded> {
    return bytesIn(body.type, root, body);
}

/**
 * The bytes of the body and the headers to send with them. A content type is added only when
 * the user wrote none: what they typed in the headers is what they meant, whatever the body.
 */
export async function requestBodyBytes(
    root: string,
    body: ResolvedBody,
    headers: readonly Header[],
): Promise<BodyBytes> {
    const { bytes, contentType } = await bytesOf(root, body);
    const written = headers.some(([name]) => name.toLowerCase() === 'content-type');

    if (contentType === undefined || written) {
        return { bytes, headers: [...headers] };
    }

    return { bytes, headers: [...headers, ['content-type', contentType]] };
}
