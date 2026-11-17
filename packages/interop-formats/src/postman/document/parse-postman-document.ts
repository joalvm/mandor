import type { z } from 'zod';

import { sniffPostman } from './sniff-postman.js';
import { PostmanParseError } from './postman-parse-error.js';
import { postmanCollectionSchema, type PostmanCollection } from './postman-collection-schema.js';
import { postmanEnvironmentSchema, type PostmanEnvironment } from './postman-environment-schema.js';

export type PostmanDocument =
    | { kind: 'collection'; collection: PostmanCollection }
    | { kind: 'environment'; environment: PostmanEnvironment }
    | { kind: 'globals'; environment: PostmanEnvironment };

/**
 * Text to what the mapper reads. The schema settles the forms v2.1 lets a thing be written in;
 * the mapper reads the file as written, with its id and its variables as they are.
 */
export function parsePostmanDocument(text: string): PostmanDocument {
    const json = jsonOf(text);
    const kind = sniffPostman(json);

    if (kind === 'collection') {
        return { kind, collection: checked(postmanCollectionSchema.safeParse(json)) };
    }

    return { kind, environment: checked(postmanEnvironmentSchema.safeParse(json)) };
}

function jsonOf(text: string): unknown {
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new PostmanParseError([`The file is not JSON: ${String(error)}`]);
    }
}

function checked<T>(result: z.ZodSafeParseResult<T>): T {
    if (result.success) {
        return result.data;
    }

    throw new PostmanParseError(
        result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
    );
}
