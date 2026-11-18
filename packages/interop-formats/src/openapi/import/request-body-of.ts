import { type BodyMapping, degradation, type InteropRequestBody } from '@mandor/interop-core';
import type { RequestBody, RequestFormField, RequestLine } from '@mandor/schema';

import { asRecord, recordAt } from '../document/node-access.js';
import { exampleText } from './example-text.js';
import { jsonRecordOf } from './json-record.js';

const NONE: BodyMapping = { body: { type: 'none' }, degradations: [] };

/**
 * The body type a media type reads as. The sample is the document's own text, kept as written: a
 * form is the one place it is split, one row per property, because that is how a form is edited.
 */
export function requestBodyTypeOf(body: InteropRequestBody | undefined): BodyMapping {
    if (body === undefined) {
        return NONE;
    }

    const type = body.contentType.replace(/;.*$/u, '').trim().toLowerCase();
    const ofRows = ROW_BODIES.get(type);

    if (ofRows !== undefined) {
        return whole(ofRows(body));
    }

    const text = textTypeOf(type);

    return text === undefined
        ? {
              ...NONE,
              degradations: [degradation('bodyTypeEmpty', { type: body.contentType })],
          }
        : whole({ type: text, content: body.value });
}

/** The media types whose sample is split into rows, and the body each makes. */
const ROW_BODIES = new Map<string, (body: InteropRequestBody) => RequestBody>([
    [
        'application/x-www-form-urlencoded',
        (body) => ({ type: 'urlencoded', fields: rowsOf(body.value) }),
    ],
    ['multipart/form-data', (body) => ({ type: 'form', fields: formRowsOf(body) })],
]);

function whole(body: RequestBody): BodyMapping {
    return { body, degradations: [] };
}

/** The media types that read as a text body, in the order they are asked; the first match wins. */
const TEXT_TYPES: readonly (readonly [RegExp, 'json' | 'xml' | 'text'])[] = [
    [/^(application\/json|.*\+json)$/u, 'json'],
    [/^(application\/xml|text\/xml|.*\+xml)$/u, 'xml'],
    [/^text\//u, 'text'],
];

function textTypeOf(type: string): 'json' | 'xml' | 'text' | undefined {
    return TEXT_TYPES.find(([pattern]) => pattern.test(type))?.[1];
}

function rowsOf(sample: string): RequestLine[] {
    return Object.entries(jsonRecordOf(sample)).map(([key, value]) => ({
        key,
        value: exampleText(value),
        enabled: true,
    }));
}

/** How a row of a form reads its kind from the `format` its schema gives the property. */
const ROW_KINDS = new Map<unknown, (row: RequestLine) => RequestFormField>([
    ['binary', (row) => ({ ...row, value: '', kind: 'file' })],
]);

function formRowsOf(body: InteropRequestBody): RequestFormField[] {
    const properties = recordAt(jsonRecordOf(body.schema), 'properties');

    return rowsOf(body.value).map((row) => {
        const format = asRecord(properties[row.key])['format'];

        return (ROW_KINDS.get(format) ?? textRow)(row);
    });
}

function textRow(row: RequestLine): RequestFormField {
    return { ...row, kind: 'text' };
}
