import { degradation, type Degradation, isRecord } from '@mandor/interop-core';
import { dereference, type ParserOptions, validate } from '@readme/openapi-parser';
import { upgrade } from '@scalar/openapi-upgrader';
import type { OpenAPIV3_1 } from 'openapi-types';
import { parse } from 'yaml';

import { OpenapiParseError } from './openapi-parse-error.js';

export type ParsedOpenapi = {
    /** OpenAPI 3.1 with every `$ref` followed, except the ones that point back at themselves. */
    document: Record<string, unknown>;
    /** What the document as a whole did that the user should read: a conversion, a warning. */
    notes: Degradation[];
};

// What the specification calls an error and real documents do all the time: a second operation
// with the same id, a path parameter nobody declared. They are read, and said in the notes.
const LENIENT = {
    'array-without-items': 'warning',
    'duplicate-non-request-body-parameters': 'warning',
    'duplicate-operation-id': 'warning',
    'non-optional-path-parameters': 'warning',
    'path-parameters-not-in-parameters': 'warning',
    'path-parameters-not-in-path': 'warning',
} as const;

// A document is data. An external `$ref` is a path or an address someone else chose, and
// following it would read a file or the network on the user's behalf: it stays as written.
const OPTIONS: ParserOptions = {
    resolve: { external: false, file: false },
    validate: {
        // Only the first line of an error reaches the user, and a code frame of a large document
        // costs many times its size in memory.
        errors: { codeFrames: false },
        rules: {
            openapi: LENIENT,
            swagger: { ...LENIENT, 'unknown-required-schema-property': 'warning' },
        },
    },
};

/**
 * The one place that reads the parser. The text becomes data, the data is validated as the
 * document it says it is, and a Swagger 2.0 or OpenAPI 3.0 document is lifted to 3.1 so that
 * everything after this reads one shape.
 */
export async function parseOpenapiDocument(text: string): Promise<ParsedOpenapi> {
    const raw = rawDocumentOf(text);
    const result = await validate(structuredClone(raw), OPTIONS);

    if (!result.valid) {
        throw new OpenapiParseError(result.errors.map((error) => firstLine(error.message)));
    }

    const circular = new Set<string>();
    const resolved = await dereference(upgraded(raw), {
        ...OPTIONS,
        dereference: { circular: 'ignore', onCircular: (path) => circular.add(schemaNameOf(path)) },
    });

    return {
        document: { ...resolved },
        notes: [
            ...conversionNotes(result.specification, raw),
            ...result.warnings.map((warning) =>
                degradation('documentWarning', { message: firstLine(warning.message) }),
            ),
            ...[...circular].map((name) => degradation('circularSchema', { name })),
        ],
    };
}

/**
 * The upgrader and the parser type the same document with two packages of types that do not
 * meet. What the first returns is a document the second reads: the cast says so in one place.
 */
function upgraded(raw: OpenAPIV3_1.Document): OpenAPIV3_1.Document {
    return upgrade(structuredClone(raw), '3.1') as unknown as OpenAPIV3_1.Document;
}

/** What the validator needs from here is that it is an API document; it checks the rest. */
function isApiDocument(value: unknown): value is OpenAPIV3_1.Document {
    return isRecord(value) && ('openapi' in value || 'swagger' in value);
}

function rawDocumentOf(text: string): OpenAPIV3_1.Document {
    const parsed = parseText(text);

    if (!isApiDocument(parsed)) {
        throw new OpenapiParseError([
            'The document is not an OpenAPI or Swagger description: it has no "openapi" or "swagger" field',
        ]);
    }

    return parsed;
}

function parseText(text: string): unknown {
    try {
        return parse(text);
    } catch (error) {
        throw new OpenapiParseError([firstLine(String(error))]);
    }
}

function conversionNotes(
    specification: 'OpenAPI' | 'Swagger' | null,
    raw: OpenAPIV3_1.Document,
): Degradation[] {
    if (specification === 'Swagger') {
        return [degradation('convertedSwagger')];
    }

    const version: unknown = Reflect.get(raw, 'openapi');

    return typeof version === 'string' && version.startsWith('3.0')
        ? [degradation('convertedOpenapi30')]
        : [];
}

/**
 * The parser reports where the loop closes, as a path with the working directory in front:
 * `/…/#/components/schemas/Node/properties/child` is a loop of the schema called `Node`.
 */
function schemaNameOf(path: string): string {
    return path.replace(/^.*#\/(?:components\/schemas\/)?/u, '').replace(/\/.*$/u, '');
}

/** The validator draws a frame of the source around each message; the first line is the news. */
function firstLine(message: string): string {
    return message.replace(/\n[\s\S]*$/u, '');
}
