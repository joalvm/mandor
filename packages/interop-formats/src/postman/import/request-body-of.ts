import {
    binaryBodyOf,
    type BodyMapping,
    degradation,
    fileRowOf,
    formBodyOf,
    type FormRow,
    type InteropBodyField,
    type InteropRequestBody,
} from '@mandor/interop-core';
import type { RequestBody } from '@mandor/schema';

type Builder = (body: InteropRequestBody) => BodyMapping;

const NONE: RequestBody = { type: 'none' };

const BUILDERS = new Map<string, Builder>([
    ['application/json', text('json')],
    ['application/xml', text('xml')],
    ['text/plain', text('text')],
    ['application/x-www-form-urlencoded', urlencoded],
    ['multipart/form-data', form],
    ['application/octet-stream', binary],
    ['application/graphql', graphql],
]);

/**
 * The body of a request as Mandor holds it. A file of the document is named by its file name
 * alone and has to be copied to the repo root, since the body reads files from there; a body
 * with no type Mandor knows enters empty and says so.
 */
export function requestBodyOf(body: InteropRequestBody | undefined): BodyMapping {
    if (body === undefined) {
        return { body: NONE, degradations: [] };
    }

    const build = BUILDERS.get(body.contentType);

    return (
        build?.(body) ?? {
            body: NONE,
            degradations: [degradation('bodyTypeEmpty', { type: body.contentType })],
        }
    );
}

function text(type: 'json' | 'xml' | 'text'): Builder {
    return (body) => ({ body: { type, content: body.value }, degradations: [] });
}

function urlencoded(body: InteropRequestBody): BodyMapping {
    const fields = (body.fields ?? []).map(({ key, value, enabled }) => ({ key, value, enabled }));

    return { body: { type: 'urlencoded', fields }, degradations: [] };
}

function form(body: InteropRequestBody): BodyMapping {
    return formBodyOf((body.fields ?? []).map(formRow));
}

function formRow(row: InteropBodyField): FormRow {
    const degradations =
        row.contentType === undefined
            ? []
            : [
                  degradation('fieldContentTypeNotKept', {
                      contentType: row.contentType,
                      key: row.key,
                  }),
              ];

    if (row.kind === 'text') {
        return {
            field: { key: row.key, value: row.value, enabled: row.enabled, kind: 'text' },
            degradations,
        };
    }

    return fileRowOf({ key: row.key, source: row.value, enabled: row.enabled }, degradations);
}

function binary(body: InteropRequestBody): BodyMapping {
    return binaryBodyOf(body.value);
}

function graphql(body: InteropRequestBody): BodyMapping {
    return {
        body: { type: 'graphql', query: body.value, variables: body.variables ?? '' },
        degradations: [],
    };
}
