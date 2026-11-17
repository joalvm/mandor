import { describe, expect, it } from 'vitest';

import { exampleBodyOf, postDataBodyOf } from '../../../src/har/import/har-body.js';

const PNG = 'iVBORw0KGgo=';

describe('postDataBodyOf', () => {
    it('has no body when the request carried none', () => {
        expect(postDataBodyOf(undefined)).toEqual({ body: undefined, binary: false });
    });

    it('keeps a text body as its sample, without the parameters of the type', () => {
        expect(
            postDataBodyOf({ mimeType: 'application/json; charset=utf-8', text: '{"a":1}' }),
        ).toEqual({
            body: { contentType: 'application/json', value: '{"a":1}', required: true },
            binary: false,
        });
    });

    it('keeps an empty text body empty', () => {
        expect(postDataBodyOf({ mimeType: 'text/plain' }).body?.value).toBe('');
    });

    it('turns a multipart body into rows, a file among them', () => {
        const { body } = postDataBodyOf({
            mimeType: 'multipart/form-data; boundary=x',
            params: [
                { name: 'title', value: 'Logo' },
                { name: 'file', fileName: 'logo.png', contentType: 'image/png' },
                { name: 'empty' },
            ],
        });

        expect(body?.fields).toEqual([
            { key: 'title', value: 'Logo', enabled: true, kind: 'text' },
            {
                key: 'file',
                value: 'logo.png',
                enabled: true,
                kind: 'file',
                contentType: 'image/png',
            },
            { key: 'empty', value: '', enabled: true, kind: 'text' },
        ]);
    });

    it('gives a multipart body with no parameters no rows', () => {
        expect(postDataBodyOf({ mimeType: 'multipart/form-data' }).body?.fields).toEqual([]);
    });

    it('turns urlencoded parameters into rows', () => {
        const { body } = postDataBodyOf({
            mimeType: 'application/x-www-form-urlencoded',
            params: [{ name: 'a', value: '1' }],
        });

        expect(body?.fields).toEqual([{ key: 'a', value: '1', enabled: true, kind: 'text' }]);
    });

    it('reads urlencoded text when the recorder gave no parameters', () => {
        const { body } = postDataBodyOf({
            mimeType: 'application/x-www-form-urlencoded',
            text: 'a=1&b=two%20words',
        });

        expect(body?.fields).toEqual([
            { key: 'a', value: '1', enabled: true, kind: 'text' },
            { key: 'b', value: 'two words', enabled: true, kind: 'text' },
        ]);
    });

    it('reads an urlencoded body with nothing in it as no rows', () => {
        expect(
            postDataBodyOf({ mimeType: 'application/x-www-form-urlencoded' }).body?.fields,
        ).toEqual([]);
    });

    it('marks bytes no row can hold and leaves the sample empty', () => {
        expect(postDataBodyOf({ mimeType: 'application/octet-stream', text: 'xx' })).toEqual({
            body: { contentType: 'application/octet-stream', value: '', required: true },
            binary: true,
        });
    });
});

describe('exampleBodyOf', () => {
    it('has an empty body when the response showed no content', () => {
        expect(exampleBodyOf(undefined)).toEqual({ body: '', binary: false });
    });

    it('keeps a text body as it was recorded', () => {
        expect(exampleBodyOf({ mimeType: 'application/json', text: '{"a":1}' })).toEqual({
            body: '{"a":1}',
            binary: false,
        });
    });

    it('keeps an empty text body empty', () => {
        expect(exampleBodyOf({ mimeType: 'application/json' })).toEqual({
            body: '',
            binary: false,
        });
    });

    it('decodes a text body that came in base64', () => {
        const text = Buffer.from('{"a":"ñ"}', 'utf8').toString('base64');

        expect(exampleBodyOf({ mimeType: 'application/json', encoding: 'base64', text })).toEqual({
            body: '{"a":"ñ"}',
            binary: false,
        });
    });

    it('marks a base64 body that is not text', () => {
        expect(exampleBodyOf({ mimeType: 'image/png', encoding: 'base64', text: PNG })).toEqual({
            body: '',
            binary: true,
        });
    });

    it('marks bytes that claim to be text but are not UTF-8', () => {
        const text = Buffer.from([0xff, 0xfe, 0xfd]).toString('base64');

        expect(exampleBodyOf({ mimeType: 'text/plain', encoding: 'base64', text })).toEqual({
            body: '',
            binary: true,
        });
    });

    it('marks a body of a binary type even when it was written as text', () => {
        expect(exampleBodyOf({ mimeType: 'image/png', text: 'x' })).toEqual({
            body: '',
            binary: true,
        });
    });

    it('reads a base64 body with no text as empty', () => {
        expect(exampleBodyOf({ mimeType: 'text/plain', encoding: 'base64' })).toEqual({
            body: '',
            binary: false,
        });
    });
});
