import {
    binaryBodyOf,
    type BodyMapping,
    degradation,
    fileRowOf,
    formBodyOf,
    type FormRow,
    isRecord,
} from '@mandor/interop-core';
import type { RequestBody } from '@mandor/schema';

import type { InsomniaBody, InsomniaRow } from '../document/insomnia-tree.js';

type Builder = (body: InsomniaBody) => BodyMapping;

const NONE: RequestBody = { type: 'none' };

const BUILDERS = new Map<string, Builder>([
    ['application/json', textBody('json')],
    ['application/xml', textBody('xml')],
    ['text/plain', textBody('text')],
    ['application/x-www-form-urlencoded', urlencoded],
    ['multipart/form-data', form],
    ['application/octet-stream', binary],
    ['application/graphql', graphql],
]);

/** The content type without its parameters, the way the table of builders knows it. */
function mimeTypeOf(body: InsomniaBody): string {
    return body.mimeType.replace(/;.*$/su, '').trim().toLowerCase();
}

/**
 * The body of a request as Mandor holds it. A file is named by its file name alone and has to
 * be copied to the repo root, since the body reads files from there. A body of a type Mandor
 * has no word for keeps its text as a text body when it has any, and says so.
 */
export function requestBodyOf(body: InsomniaBody | undefined): BodyMapping {
    if (body === undefined) {
        return { body: NONE, degradations: [] };
    }

    const mimeType = mimeTypeOf(body);
    const build = BUILDERS.get(mimeType);

    if (build !== undefined) {
        return build(body);
    }

    if (body.text === '') {
        return { body: NONE, degradations: [] };
    }

    return {
        body: { type: 'text', content: body.text },
        degradations: [degradation('bodyTypeAsText', { type: mimeType })],
    };
}

function textBody(type: 'json' | 'xml' | 'text'): Builder {
    return (body) => ({ body: { type, content: body.text }, degradations: [] });
}

function urlencoded(body: InsomniaBody): BodyMapping {
    const fields = body.params.map((row) => ({
        key: row.name,
        value: row.value,
        enabled: !row.disabled,
    }));

    return { body: { type: 'urlencoded', fields }, degradations: [] };
}

function form(body: InsomniaBody): BodyMapping {
    return formBodyOf(body.params.map(formRow));
}

function formRow(row: InsomniaRow): FormRow {
    if (row.type !== 'file') {
        return {
            field: { key: row.name, value: row.value, enabled: !row.disabled, kind: 'text' },
            degradations: [],
        };
    }

    return fileRowOf({ key: row.name, source: row.fileName, enabled: !row.disabled }, []);
}

function binary(body: InsomniaBody): BodyMapping {
    return binaryBodyOf(body.fileName);
}

/** The text of a GraphQL body is JSON with the query, the variables and the operation name. */
function graphql(body: InsomniaBody): BodyMapping {
    const written = jsonOf(body.text);

    if (!isRecord(written) || typeof written['query'] !== 'string') {
        return { body: { type: 'graphql', query: body.text, variables: '' }, degradations: [] };
    }

    const variables = written['variables'];
    const operationName = written['operationName'];

    return {
        body: {
            type: 'graphql',
            query: written['query'],
            variables: typeof variables === 'string' ? variables : variablesText(variables),
            ...(typeof operationName === 'string' && operationName !== '' ? { operationName } : {}),
        },
        degradations: [],
    };
}

function variablesText(variables: unknown): string {
    return variables === undefined ? '' : JSON.stringify(variables, null, 2);
}

function jsonOf(text: string): unknown {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return undefined;
    }
}
