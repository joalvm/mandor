import { degradation, type InteropRequestBody } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { requestBodyOf } from '../../../src/har/import/request-body-of.js';

function bodyOf(contentType: string, rest: Partial<InteropRequestBody> = {}): InteropRequestBody {
    return { contentType, value: '', required: true, ...rest };
}

describe('requestBodyOf of the types Mandor holds', () => {
    it('has no body when the request carried none', () => {
        expect(requestBodyOf(undefined)).toEqual({ body: { type: 'none' }, degradations: [] });
    });

    it.each([
        ['application/json', 'json'],
        ['application/vnd.api+json', 'json'],
        ['application/xml', 'xml'],
        ['text/xml', 'xml'],
        ['application/soap+xml', 'xml'],
        ['text/plain', 'text'],
        ['', 'text'],
    ])('keeps %j as the %s body it is', (contentType, type) => {
        expect(requestBodyOf(bodyOf(contentType, { value: 'x' }))).toEqual({
            body: { type, content: 'x' },
            degradations: [],
        });
    });

    it('turns urlencoded rows into the lines of the body', () => {
        const fields = [{ key: 'a', value: '1', enabled: true, kind: 'text' as const }];

        expect(requestBodyOf(bodyOf('application/x-www-form-urlencoded', { fields }))).toEqual({
            body: { type: 'urlencoded', fields: [{ key: 'a', value: '1', enabled: true }] },
            degradations: [],
        });
    });

    it('has no urlencoded rows when the recording gave none', () => {
        expect(requestBodyOf(bodyOf('application/x-www-form-urlencoded')).body).toEqual({
            type: 'urlencoded',
            fields: [],
        });
    });
});

describe('requestBodyOf of what Mandor has no type for', () => {
    it('keeps another text as text and says it', () => {
        expect(requestBodyOf(bodyOf('text/csv', { value: 'a,b' }))).toEqual({
            body: { type: 'text', content: 'a,b' },
            degradations: [degradation('contentTypeAsText', { mime: 'text/csv' })],
        });
    });

    it('leaves bytes out without a sentence: the operation already says it', () => {
        expect(requestBodyOf(bodyOf('application/octet-stream'))).toEqual({
            body: { type: 'none' },
            degradations: [],
        });
    });
});

describe('requestBodyOf of a multipart body', () => {
    it.each([[undefined], [[]]])('enters with no body when it has no fields (%j)', (fields) => {
        expect(requestBodyOf(bodyOf('multipart/form-data', { fields }))).toEqual({
            body: { type: 'none' },
            degradations: [degradation('multipartNoFields')],
        });
    });

    it('keeps the text rows and names the files by their file name', () => {
        const fields = [
            { key: 'title', value: 'Logo', enabled: true, kind: 'text' as const },
            { key: 'file', value: 'C:\\pics\\logo.png', enabled: true, kind: 'file' as const },
        ];

        expect(requestBodyOf(bodyOf('multipart/form-data', { fields }))).toEqual({
            body: {
                type: 'form',
                fields: [
                    { key: 'title', value: 'Logo', enabled: true, kind: 'text' },
                    { key: 'file', value: 'logo.png', enabled: true, kind: 'file' },
                ],
            },
            degradations: [degradation('fileFieldToCopy', { name: 'logo.png', key: 'file' })],
        });
    });

    it('says the content type of a row it does not keep', () => {
        const fields = [
            {
                key: 'a',
                value: '1',
                enabled: true,
                kind: 'text' as const,
                contentType: 'text/plain',
            },
            {
                key: 'f',
                value: 'x.png',
                enabled: true,
                kind: 'file' as const,
                contentType: 'image/png',
            },
        ];
        const { degradations } = requestBodyOf(bodyOf('multipart/form-data', { fields }));

        expect(degradations).toContainEqual(
            degradation('fieldContentTypeNotKept', { contentType: 'text/plain', key: 'a' }),
        );
        expect(degradations).toContainEqual(
            degradation('fieldContentTypeNotKept', { contentType: 'image/png', key: 'f' }),
        );
    });

    it('leaves out a file row whose name no path can hold', () => {
        const fields = [
            { key: 'empty', value: '', enabled: true, kind: 'file' as const },
            { key: 'up', value: '..', enabled: true, kind: 'file' as const },
        ];

        expect(requestBodyOf(bodyOf('multipart/form-data', { fields }))).toEqual({
            body: { type: 'form', fields: [] },
            degradations: [
                degradation('fileFieldNoName', { key: 'empty' }),
                degradation('fileFieldNoName', { key: 'up' }),
            ],
        });
    });
});
