import { isRecord, type InteropResponseExample } from '@mandor/interop-core';

import { asRecord, recordAt } from '../document/node-access.js';
import { exampleText } from './example-text.js';
import { sampleOf } from './map-request-body.js';

type MediaEntry = [contentType: string, media: unknown];

/**
 * The responses the document shows: one per example, under the status it answers with, each
 * with the schema of its media type. A lone `example` is named by the status, a named one by its
 * own name. A status that shows no example and has a schema gets one, made from the schema: the
 * schema lives in the example, and without one it would have nowhere to stay. A status with
 * neither adds nothing.
 */
export function responsesOf(
    operation: Record<string, unknown>,
    document: Record<string, unknown>,
): InteropResponseExample[] {
    return Object.entries(recordAt(operation, 'responses')).flatMap(([status, response]) => {
        const content = Object.entries(recordAt(asRecord(response), 'content'));
        const shown = content.flatMap(([contentType, media]) =>
            shownOf(status, contentType, asRecord(media)),
        );

        return shown.length > 0 ? shown : madeUpOf(status, content, document);
    });
}

function shownOf(
    status: string,
    contentType: string,
    media: Record<string, unknown>,
): InteropResponseExample[] {
    const schema = schemaTextOf(media);

    return examplesOf(media).map(({ name, value }) => ({
        name: name ?? status,
        status,
        contentType,
        body: exampleText(value),
        ...(schema !== undefined && { schema }),
    }));
}

function examplesOf(media: Record<string, unknown>): { name?: string; value: unknown }[] {
    const named = Object.entries(recordAt(media, 'examples'))
        .map(([name, example]) => ({ name, value: asRecord(example)['value'] }))
        .filter((example) => example.value !== undefined);

    return media['example'] === undefined ? named : [{ value: media['example'] }];
}

/** The answer of the first media type with a schema, as the schema describes it; named by the status. */
function madeUpOf(
    status: string,
    content: readonly MediaEntry[],
    document: Record<string, unknown>,
): InteropResponseExample[] {
    for (const [contentType, media] of content) {
        const schema = asRecord(media)['schema'];
        const text = schemaTextOf(asRecord(media));

        if (isRecord(schema) && text !== undefined) {
            const body = exampleText(sampleOf(schema, document));

            return [{ name: status, status, contentType, body, schema: text }];
        }
    }

    return [];
}

/**
 * The schema of a media type as the JSON text the example keeps. The empty schema the export
 * leaves where it had none says nothing. The document arrives with its references followed; one
 * that points back at itself stays a reference, and the text keeps it.
 */
function schemaTextOf(media: Record<string, unknown>): string | undefined {
    const schema = media['schema'];

    return isRecord(schema) && Object.keys(schema).length > 0 ? safeJson(schema) : undefined;
}

/** A schema with a loop in it cannot be told as text: it says nothing rather than fail the import. */
function safeJson(schema: Record<string, unknown>): string | undefined {
    try {
        return JSON.stringify(schema, null, 2);
    } catch {
        return undefined;
    }
}
