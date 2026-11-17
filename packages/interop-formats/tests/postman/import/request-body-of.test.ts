import { degradation, type InteropRequestBody } from '@mandor/interop-core';
import { describe, expect, it } from 'vitest';

import { requestBodyOf } from '../../../src/postman/import/request-body-of.js';

function body(contentType: string, more: Partial<InteropRequestBody> = {}): InteropRequestBody {
    return { contentType, value: '', required: false, ...more };
}

describe('requestBodyOf', () => {
    it('is no body when the request has none', () => {
        expect(requestBodyOf(undefined)).toEqual({ body: { type: 'none' }, degradations: [] });
    });

    it.each([
        ['application/json', 'json'],
        ['application/xml', 'xml'],
        ['text/plain', 'text'],
    ])('keeps a %s body as text of type %s', (contentType, type) => {
        expect(requestBodyOf(body(contentType, { value: '{{x}}' }))).toEqual({
            body: { type, content: '{{x}}' },
            degradations: [],
        });
    });

    it('keeps the rows of a urlencoded body with their switch', () => {
        const fields = [
            { key: 'a', value: '1', enabled: true, kind: 'text' as const },
            { key: 'b', value: '2', enabled: false, kind: 'text' as const },
        ];

        expect(requestBodyOf(body('application/x-www-form-urlencoded', { fields })).body).toEqual({
            type: 'urlencoded',
            fields: [
                { key: 'a', value: '1', enabled: true },
                { key: 'b', value: '2', enabled: false },
            ],
        });
        expect(requestBodyOf(body('application/x-www-form-urlencoded')).body).toEqual({
            type: 'urlencoded',
            fields: [],
        });
    });

    it('names a file of a form by its file name, leaves out a row with no file, and says what it dropped', () => {
        const fields = [
            {
                key: 'name',
                value: 'ana',
                enabled: true,
                kind: 'text' as const,
                contentType: 'text/plain',
            },
            {
                key: 'avatar',
                value: 'C:\\Users\\ana\\avatar.png',
                enabled: true,
                kind: 'file' as const,
            },
            { key: 'cv', value: '../up/cv.pdf', enabled: false, kind: 'file' as const },
            { key: 'empty', value: '', enabled: true, kind: 'file' as const },
        ];
        const result = requestBodyOf(body('multipart/form-data', { fields }));

        expect(result.body).toEqual({
            type: 'form',
            fields: [
                { key: 'name', value: 'ana', enabled: true, kind: 'text' },
                { key: 'avatar', value: 'avatar.png', enabled: true, kind: 'file' },
                { key: 'cv', value: 'cv.pdf', enabled: false, kind: 'file' },
            ],
        });
        expect(result.degradations).toEqual([
            degradation('fieldContentTypeNotKept', { contentType: 'text/plain', key: 'name' }),
            degradation('fileFieldToCopy', { name: 'avatar.png', key: 'avatar' }),
            degradation('fileFieldToCopy', { name: 'cv.pdf', key: 'cv' }),
            degradation('fileFieldWithoutFile', { key: 'empty' }),
        ]);
        expect(requestBodyOf(body('multipart/form-data')).body).toEqual({
            type: 'form',
            fields: [],
        });
    });

    it('names the file of a binary body, or enters with no body when there is none', () => {
        expect(
            requestBodyOf(body('application/octet-stream', { value: '/home/ana/data.bin' })),
        ).toEqual({
            body: { type: 'binary', file: 'data.bin' },
            degradations: [degradation('fileToCopy', { name: 'data.bin' })],
        });
        expect(requestBodyOf(body('application/octet-stream', { value: '/home/ana/' }))).toEqual({
            body: { type: 'none' },
            degradations: [degradation('fileBodyWithoutFile')],
        });
    });

    it('keeps the query and the variables of a graphql body, empty when it has none', () => {
        expect(
            requestBodyOf(body('application/graphql', { value: '{ me }', variables: '{"a":1}' }))
                .body,
        ).toEqual({
            type: 'graphql',
            query: '{ me }',
            variables: '{"a":1}',
        });
        expect(requestBodyOf(body('application/graphql', { value: '{ me }' })).body).toMatchObject({
            variables: '',
        });
    });

    it('enters empty with a line when it does not know the type', () => {
        expect(requestBodyOf(body('application/pdf'))).toEqual({
            body: { type: 'none' },
            degradations: [degradation('bodyTypeEmpty', { type: 'application/pdf' })],
        });
    });
});
