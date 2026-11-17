import { documentRootOf, isRecord, type InteropFile } from '@mandor/interop-core';

import { PostmanParseError } from './postman-parse-error.js';

const V21 = /\/collection\/v2\.1\.\d+\/collection\.json$/;
const V20 = /\/collection\/v2\.0\.\d+\/collection\.json$/;
const EXPORT_AGAIN = 'export it again from Postman as v2.1';

export type PostmanKind = 'collection' | 'environment' | 'globals';

/**
 * Which of the three files this is, told by what is inside and never by the extension: all of
 * them are `.json`. Anything else refuses with the one sentence that says what to do about it.
 */
export function sniffPostman(json: unknown): PostmanKind {
    if (!isRecord(json)) {
        throw notPostman();
    }

    const schema = isRecord(json['info']) ? json['info']['schema'] : undefined;

    if (typeof schema === 'string') {
        return kindOfSchema(schema);
    }

    if (!('info' in json) && Array.isArray(json['requests']) && Array.isArray(json['order'])) {
        throw new PostmanParseError([`This is a Postman collection v1: ${EXPORT_AGAIN}`]);
    }

    return kindOfScope(json['_postman_variable_scope']);
}

/**
 * Whether a text is a Postman file of any version or kind, for the app that has to tell it from
 * the other formats it reads. A v1 or v2.0 collection counts: it is Postman, and reading it says
 * how to export it again.
 */
export function looksLikePostman(text: string): boolean {
    const root = documentRootOf(text);

    if (root === null) {
        return false;
    }

    const info = root['info'];
    const hasSchema = isRecord(info) && typeof info['schema'] === 'string';
    const isV1 =
        !('info' in root) && Array.isArray(root['requests']) && Array.isArray(root['order']);

    return hasSchema || isV1 || typeof root['_postman_variable_scope'] === 'string';
}

/** Whether every file is a Postman one: a collection with its environments is one import. */
export function looksLikePostmanFiles(files: readonly InteropFile[]): boolean {
    return files.length > 0 && files.every((file) => looksLikePostman(file.text));
}

function kindOfSchema(schema: string): PostmanKind {
    if (V21.test(schema)) {
        return 'collection';
    }

    if (V20.test(schema)) {
        throw new PostmanParseError([`This is a Postman collection v2.0: ${EXPORT_AGAIN}`]);
    }

    throw new PostmanParseError([`The collection schema "${schema}" is not v2.1: ${EXPORT_AGAIN}`]);
}

function kindOfScope(scope: unknown): PostmanKind {
    if (scope === 'environment' || scope === 'globals') {
        return scope;
    }

    throw notPostman();
}

function notPostman(): PostmanParseError {
    return new PostmanParseError(['This is not a Postman collection, environment or globals file']);
}
