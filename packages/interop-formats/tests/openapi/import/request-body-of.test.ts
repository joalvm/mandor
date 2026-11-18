import { degradation, type InteropRequestBody } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { requestBodyTypeOf } from '../../../src/openapi/import/request-body-of.js';

function body(contentType: string, value: string, schema?: string): InteropRequestBody {
    return { contentType, value, required: false, ...(schema === undefined ? {} : { schema }) };
}

describe('the body type an OpenAPI media type becomes', () => {
    it('reads json, xml and text as the content, as written', () => {
        expect(requestBodyTypeOf(body('application/json', '{"a":1}'))).toEqual({
            body: { type: 'json', content: '{"a":1}' },
            degradations: [],
        });
        expect(
            requestBodyTypeOf(body('application/vnd.api+json; charset=utf-8', '{}')),
        ).toMatchObject({
            body: { type: 'json' },
        });
        expect(requestBodyTypeOf(body('application/xml', '<a/>'))).toMatchObject({
            body: { type: 'xml', content: '<a/>' },
        });
        expect(requestBodyTypeOf(body('application/atom+xml', '<a/>'))).toMatchObject({
            body: { type: 'xml' },
        });
        expect(requestBodyTypeOf(body('text/plain', 'hi'))).toMatchObject({
            body: { type: 'text', content: 'hi' },
        });
    });

    it('turns an urlencoded sample into one row per property', () => {
        const sample = '{"name":"rex","tags":["a","b"],"age":3}';

        expect(requestBodyTypeOf(body('application/x-www-form-urlencoded', sample))).toEqual({
            body: {
                type: 'urlencoded',
                fields: [
                    { key: 'name', value: 'rex', enabled: true },
                    { key: 'tags', value: '[\n  "a",\n  "b"\n]', enabled: true },
                    { key: 'age', value: '3', enabled: true },
                ],
            },
            degradations: [],
        });
    });

    it('turns a multipart sample into form rows, with a file where the schema says binary', () => {
        const schema =
            '{"type":"object","properties":{"note":{"type":"string"},"photo":{"type":"string","format":"binary"}}}';
        const sample = '{"note":"hi","photo":"string"}';

        expect(requestBodyTypeOf(body('multipart/form-data', sample, schema))).toEqual({
            body: {
                type: 'form',
                fields: [
                    { key: 'note', value: 'hi', enabled: true, kind: 'text' },
                    { key: 'photo', value: '', enabled: true, kind: 'file' },
                ],
            },
            degradations: [],
        });
    });

    it('gives no rows when the sample is not an object', () => {
        expect(requestBodyTypeOf(body('application/x-www-form-urlencoded', 'a=1'))).toMatchObject({
            body: { type: 'urlencoded', fields: [] },
        });
    });

    it('enters empty, and says so, when Mandor has no body type for it', () => {
        expect(requestBodyTypeOf(body('application/octet-stream', ''))).toEqual({
            body: { type: 'none' },
            degradations: [degradation('bodyTypeEmpty', { type: 'application/octet-stream' })],
        });
    });

    it('has no body when the operation sends none', () => {
        expect(requestBodyTypeOf(undefined)).toEqual({ body: { type: 'none' }, degradations: [] });
    });
});
