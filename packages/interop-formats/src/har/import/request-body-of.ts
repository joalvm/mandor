import {
    type BodyMapping,
    degradation,
    formBodyOf,
    type FormRow,
    type InteropBodyField,
    type InteropRequestBody,
} from '@mandor/interop-core';
import { bodyFilePathSchema, type RequestBody, type RequestFormField } from '@mandor/schema';

import { baseMime, isTextMime } from './text-mime.js';

type TextType = 'json' | 'xml' | 'text';

const NONE: RequestBody = { type: 'none' };

/**
 * The body a recorded request carried, as Mandor holds it. What has no body type of its own
 * enters as text and says so; bytes enter empty, and the one who saw them says so (the extras
 * of the operation). A file of a form is named by its file name alone and has to be copied to
 * the repo root, since the body reads files from there.
 */
export function requestBodyOf(body: InteropRequestBody | undefined): BodyMapping {
    if (body === undefined) {
        return { body: NONE, degradations: [] };
    }

    const mime = baseMime(body.contentType);
    const ofFields = FIELD_BODIES.get(mime);

    return ofFields === undefined ? text(mime, body.value) : ofFields(body.fields ?? []);
}

/** The mime types whose body is rows, and the way each enters. */
const FIELD_BODIES = new Map<string, (fields: readonly InteropBodyField[]) => BodyMapping>([
    ['multipart/form-data', form],
    ['application/x-www-form-urlencoded', urlencoded],
]);

function text(mime: string, content: string): BodyMapping {
    const type = textTypeOf(mime);

    if (type !== undefined) {
        return { body: { type, content }, degradations: [] };
    }

    if (!isTextMime(mime)) {
        return { body: NONE, degradations: [] };
    }

    return {
        body: { type: 'text', content },
        degradations: [degradation('contentTypeAsText', { mime })],
    };
}

/** The mime types that read as a text body, in the order they are asked; the first match wins. */
const TEXT_TYPES: readonly (readonly [RegExp, TextType])[] = [
    [/^(application\/json|.*\+json)$/u, 'json'],
    [/^(application\/xml|text\/xml|.*\+xml)$/u, 'xml'],
    [/^(text\/plain)?$/u, 'text'],
];

function textTypeOf(mime: string): TextType | undefined {
    return TEXT_TYPES.find(([pattern]) => pattern.test(mime))?.[1];
}

function urlencoded(fields: readonly InteropBodyField[]): BodyMapping {
    return {
        body: {
            type: 'urlencoded',
            fields: fields.map(({ key, value, enabled }) => ({ key, value, enabled })),
        },
        degradations: [],
    };
}

function form(fields: readonly InteropBodyField[]): BodyMapping {
    if (fields.length === 0) {
        return {
            body: NONE,
            degradations: [degradation('multipartNoFields')],
        };
    }

    return formBodyOf(fields.map(formRow));
}

function formRow(row: InteropBodyField): FormRow {
    const kept =
        row.contentType === undefined
            ? []
            : [
                  degradation('fieldContentTypeNotKept', {
                      contentType: row.contentType,
                      key: row.key,
                  }),
              ];

    if (row.kind === 'text') {
        const field: RequestFormField = {
            key: row.key,
            value: row.value,
            enabled: row.enabled,
            kind: 'text',
        };

        return { field, degradations: kept };
    }

    const name = row.value.replace(/^.*[\\/]/su, '');

    if (!bodyFilePathSchema.safeParse(name).success) {
        return {
            degradations: [...kept, degradation('fileFieldNoName', { key: row.key })],
        };
    }

    return {
        field: { key: row.key, value: name, enabled: row.enabled, kind: 'file' },
        degradations: [...kept, degradation('fileFieldToCopy', { name, key: row.key })],
    };
}
