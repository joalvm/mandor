import type { InteropBodyField, InteropRequestBody } from '@mandor/interop-core';

import type { PostmanBody } from '../document/postman-collection-schema.js';

export type BodyResult = {
    body?: InteropRequestBody;
    /** What the body held that Mandor cannot: it travels in the extras of the operation. */
    lost?: string;
};

type Row = NonNullable<PostmanBody['formdata']>[number];

const RAW_TYPES = new Map([
    ['json', 'application/json'],
    ['xml', 'application/xml'],
]);

const BUILDERS = new Map<string, (body: PostmanBody) => InteropRequestBody>([
    ['raw', rawBody],
    ['urlencoded', urlencodedBody],
    ['formdata', formdataBody],
    ['file', fileBody],
    ['graphql', graphqlBody],
]);

/**
 * The body of a request as the IR keeps it. A body with nothing to send is no body; one that
 * Postman switched off, or in a mode Mandor does not know, is no body either, and says so in
 * `lost`.
 */
export function postmanBodyOf(body: PostmanBody | null | undefined): BodyResult {
    if (body === null || body === undefined) {
        return {};
    }

    if (body.disabled === true) {
        return { lost: 'disabledBody' };
    }

    if (body.mode === undefined || body.mode === null) {
        return {};
    }

    const build = BUILDERS.get(body.mode);

    return build === undefined ? { lost: `bodyMode:${body.mode}` } : { body: build(body) };
}

function bodyOf(
    contentType: string,
    value: string,
    more: Partial<InteropRequestBody> = {},
): InteropRequestBody {
    return { contentType, value, required: false, ...more };
}

function rawBody(body: PostmanBody): InteropRequestBody {
    const language = body.options?.raw?.language ?? '';

    return bodyOf(RAW_TYPES.get(language) ?? 'text/plain', body.raw ?? '');
}

function textRow(row: Row): InteropBodyField {
    return {
        key: row.key ?? '',
        value: row.value ?? '',
        enabled: row.disabled !== true,
        kind: 'text',
    };
}

function urlencodedBody(body: PostmanBody): InteropRequestBody {
    return bodyOf('application/x-www-form-urlencoded', '', {
        fields: (body.urlencoded ?? []).map(textRow),
    });
}

function formdataBody(body: PostmanBody): InteropRequestBody {
    return bodyOf('multipart/form-data', '', { fields: (body.formdata ?? []).flatMap(formRows) });
}

function formRows(row: Row): InteropBodyField[] {
    if (row.type !== 'file') {
        const text = textRow(row);

        return [row.contentType ? { ...text, contentType: row.contentType } : text];
    }

    const sources = Array.isArray(row.src) ? row.src : [row.src ?? ''];

    return (sources.length === 0 ? [''] : sources).map((value) => ({
        key: row.key ?? '',
        value,
        enabled: row.disabled !== true,
        kind: 'file',
    }));
}

function fileBody(body: PostmanBody): InteropRequestBody {
    return bodyOf('application/octet-stream', body.file?.src ?? '');
}

function graphqlBody(body: PostmanBody): InteropRequestBody {
    const variables = body.graphql?.variables;
    const text = typeof variables === 'string' ? variables : JSON.stringify(variables, null, 2);

    return bodyOf('application/graphql', body.graphql?.query ?? '', {
        variables: variables === undefined || variables === null ? '' : text,
    });
}
