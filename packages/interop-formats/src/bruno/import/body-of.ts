import {
    binaryBodyOf,
    type BodyMapping,
    degradation,
    fileRowOf,
    formBodyOf,
    type FormRow,
} from '@mandor/interop-core';
import type { RequestBody } from '@mandor/schema';

import type { BrunoBody, BrunoFormRow } from '../document/bruno-tree.js';

type Builder = (body: BrunoBody) => BodyMapping;

const NONE: RequestBody = { type: 'none' };

const BUILDERS = new Map<string, Builder>([
    ['json', textBody('json')],
    ['xml', textBody('xml')],
    ['text', textBody('text')],
    ['sparql', sparql],
    ['form-urlencoded', urlencoded],
    ['multipart-form', form],
    ['file', (body) => binaryBodyOf(body.file)],
    ['graphql', graphql],
]);

/**
 * The body of a request as Mandor holds it. A file is named by its file name alone and has to
 * be copied to the repo root, since the body reads files from there. A body of a kind Mandor has
 * no word for enters with no body.
 */
export function requestBodyOf(body: BrunoBody | undefined): BodyMapping {
    if (body === undefined) {
        return { body: NONE, degradations: [] };
    }

    return BUILDERS.get(body.type)?.(body) ?? { body: NONE, degradations: [] };
}

function textBody(type: 'json' | 'xml' | 'text'): Builder {
    return (body) => ({ body: { type, content: body.text }, degradations: [] });
}

function sparql(body: BrunoBody): BodyMapping {
    return {
        body: { type: 'text', content: body.text },
        degradations: [degradation('bodySparqlAsText')],
    };
}

function urlencoded(body: BrunoBody): BodyMapping {
    const fields = body.rows.map((row) => ({
        key: row.name,
        value: row.value,
        enabled: !row.disabled,
    }));

    return { body: { type: 'urlencoded', fields }, degradations: [] };
}

function formRow(row: BrunoFormRow): FormRow {
    if (row.file === '') {
        return {
            field: { key: row.name, value: row.value, enabled: !row.disabled, kind: 'text' },
            degradations: [],
        };
    }

    return fileRowOf({ key: row.name, source: row.file, enabled: !row.disabled }, []);
}

function form(body: BrunoBody): BodyMapping {
    return formBodyOf(body.rows.map(formRow));
}

function graphql(body: BrunoBody): BodyMapping {
    return {
        body: { type: 'graphql', query: body.text, variables: body.variables },
        degradations: [],
    };
}
