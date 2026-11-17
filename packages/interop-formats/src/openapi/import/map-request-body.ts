import type { InteropRequestBody } from '@mandor/interop-core';
import { sample } from 'openapi-sampler';

import { asRecord, recordAt } from '../document/node-access.js';
import { exampleText } from './example-text.js';

// The type a body is read as when the operation offers several, most readable first.
const PREFERENCE: ((type: string) => boolean)[] = [
    (type) => type.startsWith('application/json'),
    (type) => /\+json\b/u.test(type),
    (type) => type.startsWith('application/xml'),
    (type) => type.startsWith('text/'),
    (type) => type.startsWith('application/x-www-form-urlencoded'),
    (type) => type.startsWith('multipart/form-data'),
];

/**
 * The body an operation sends, in the one type the item starts with: the preferred of the types
 * it offers, else the first. The sample is the document's own example, else one made from the
 * schema, else nothing: an invented value would pass for the API's.
 */
export function requestBodyOf(
    operation: Record<string, unknown>,
    document: Record<string, unknown>,
): InteropRequestBody | undefined {
    const body = recordAt(operation, 'requestBody');
    const types = Object.keys(recordAt(body, 'content'));
    const contentType = PREFERENCE.map((matches) =>
        types.find((type) => matches(type.toLowerCase())),
    )
        .concat(types)
        .find((type) => type !== undefined);

    if (contentType === undefined) {
        return undefined;
    }

    const media = recordAt(recordAt(body, 'content'), contentType);
    const schema = recordAt(media, 'schema');

    return {
        contentType,
        value: exampleText(valueOf(media, schema, document)),
        schema: Object.keys(schema).length > 0 ? JSON.stringify(schema) : undefined,
        required: body['required'] === true,
    };
}

function valueOf(
    media: Record<string, unknown>,
    schema: Record<string, unknown>,
    document: Record<string, unknown>,
): unknown {
    const named = Object.values(recordAt(media, 'examples')).map(
        (example) => asRecord(example)['value'],
    );
    const given = [media['example'], named[0]].find((value) => value !== undefined);

    return given ?? (Object.keys(schema).length > 0 ? sampleOf(schema, document) : undefined);
}

/** A schema that points outside the document cannot be followed, and has no sample to give. */
export function sampleOf(
    schema: Record<string, unknown>,
    document: Record<string, unknown>,
): unknown {
    try {
        return sample(schema, { quiet: true }, document);
    } catch {
        return undefined;
    }
}
