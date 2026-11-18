import { describe, expect, it } from 'vitest';

import { PostmanParseError } from '../../../src/postman/document/postman-parse-error.js';
import { looksLikePostman, sniffPostman } from '../../../src/postman/document/sniff-postman.js';

const EXPORT_AGAIN = 'export it again from Postman as v2.1';

function schema(version: string) {
    return `https://schema.getpostman.com/json/collection/${version}/collection.json`;
}

describe('sniffPostman', () => {
    it.each([
        [{ info: { schema: schema('v2.1.0') } }, 'collection'],
        [{ info: { schema: schema('v2.1.12') } }, 'collection'],
        [{ _postman_variable_scope: 'environment' }, 'environment'],
        [{ _postman_variable_scope: 'globals' }, 'globals'],
    ])('tells %j apart as %s', (json, kind) => {
        expect(sniffPostman(json)).toBe(kind);
    });

    it.each([
        [
            { info: { schema: schema('v2.0.0') } },
            `This is a Postman collection v2.0: ${EXPORT_AGAIN}`,
        ],
        [
            { info: { schema: 'https://example.test/other.json' } },
            `The collection schema "https://example.test/other.json" is not v2.1: ${EXPORT_AGAIN}`,
        ],
        [{ requests: [], order: [] }, `This is a Postman collection v1: ${EXPORT_AGAIN}`],
        [{ info: {} }, 'This is not a Postman collection, environment or globals file'],
        [
            { _postman_variable_scope: 'other' },
            'This is not a Postman collection, environment or globals file',
        ],
        [[], 'This is not a Postman collection, environment or globals file'],
        ['text', 'This is not a Postman collection, environment or globals file'],
        [null, 'This is not a Postman collection, environment or globals file'],
        [
            { info: { name: 'x' }, requests: [], order: [] },
            'This is not a Postman collection, environment or globals file',
        ],
    ])('refuses %j with the one sentence that says why', (json, message) => {
        const refuse = () => sniffPostman(json);

        expect(refuse).toThrow(PostmanParseError);
        expect(refuse).toThrow(message);
    });
});

describe('looksLikePostman', () => {
    it.each([
        [JSON.stringify({ info: { schema: schema('v2.1.0') } })],
        [JSON.stringify({ info: { schema: schema('v2.0.0') } })],
        [JSON.stringify({ _postman_variable_scope: 'environment' })],
        [JSON.stringify({ requests: [], order: [] })],
    ])('takes %s for a Postman file, whatever its version', (text) => {
        expect(looksLikePostman(text)).toBe(true);
    });

    it.each([
        ['{"info": {"title": "Tienda"}, "openapi": "3.1.0"}'],
        ['{"log": {"entries": []}}'],
        ['asyncapi: 3.0.0'],
        ['just words'],
    ])('does not take %s for a Postman file', (text) => {
        expect(looksLikePostman(text)).toBe(false);
    });
});
