import { describe, expect, it } from 'vitest';

import { postmanBodyOf } from '../../../src/postman/import/map-body.js';

function raw(language?: string) {
    return {
        mode: 'raw',
        raw: 'x',
        ...(language === undefined ? {} : { options: { raw: { language } } }),
    };
}

describe('postmanBodyOf', () => {
    it('has no body when there is none, or no mode', () => {
        expect(postmanBodyOf(undefined)).toEqual({});
        expect(postmanBodyOf(null)).toEqual({});
        expect(postmanBodyOf({})).toEqual({});
        expect(postmanBodyOf({ mode: null })).toEqual({});
    });

    it('says a switched-off body was lost, whatever its mode', () => {
        expect(postmanBodyOf({ mode: 'raw', raw: 'x', disabled: true })).toEqual({
            lost: 'disabledBody',
        });
    });

    it.each([
        ['json', 'application/json'],
        ['xml', 'application/xml'],
        ['html', 'text/plain'],
        [undefined, 'text/plain'],
    ])('reads raw in language %s as %s', (language, contentType) => {
        expect(postmanBodyOf(raw(language)).body).toEqual({
            contentType,
            value: 'x',
            required: false,
        });
    });

    it('reads a raw body with no text as empty', () => {
        expect(postmanBodyOf({ mode: 'raw' }).body?.value).toBe('');
    });

    it('reads urlencoded as rows, the disabled one included', () => {
        const { body } = postmanBodyOf({
            mode: 'urlencoded',
            urlencoded: [{ key: 'a', value: '1' }, { key: 'b', disabled: true }, {}],
        });

        expect(body).toEqual({
            contentType: 'application/x-www-form-urlencoded',
            value: '',
            required: false,
            fields: [
                { key: 'a', value: '1', enabled: true, kind: 'text' },
                { key: 'b', value: '', enabled: false, kind: 'text' },
                { key: '', value: '', enabled: true, kind: 'text' },
            ],
        });
    });

    it('reads urlencoded with no rows as a body with none', () => {
        expect(postmanBodyOf({ mode: 'urlencoded' }).body?.fields).toEqual([]);
        expect(postmanBodyOf({ mode: 'formdata' }).body?.fields).toEqual([]);
    });

    it('reads formdata with text rows, and a file row for each source', () => {
        const { body } = postmanBodyOf({
            mode: 'formdata',
            formdata: [
                { key: 'n', value: 'ana', type: 'text', contentType: 'text/plain' },
                { key: 't', value: 'x' },
                { key: 'one', type: 'file', src: 'C:\\a.png' },
                { key: 'many', type: 'file', src: ['a', 'b'], disabled: true },
                { key: 'null', type: 'file', src: null },
                { type: 'file', src: [] },
            ],
        });

        expect(body).toMatchObject({ contentType: 'multipart/form-data', value: '' });
        expect(body?.fields).toEqual([
            { key: 'n', value: 'ana', enabled: true, kind: 'text', contentType: 'text/plain' },
            { key: 't', value: 'x', enabled: true, kind: 'text' },
            { key: 'one', value: 'C:\\a.png', enabled: true, kind: 'file' },
            { key: 'many', value: 'a', enabled: false, kind: 'file' },
            { key: 'many', value: 'b', enabled: false, kind: 'file' },
            { key: 'null', value: '', enabled: true, kind: 'file' },
            { key: '', value: '', enabled: true, kind: 'file' },
        ]);
    });

    it('reads a file body as its path', () => {
        expect(postmanBodyOf({ mode: 'file', file: { src: '/a.bin' } }).body).toEqual({
            contentType: 'application/octet-stream',
            value: '/a.bin',
            required: false,
        });
        expect(postmanBodyOf({ mode: 'file' }).body?.value).toBe('');
    });

    it('reads graphql with its variables as text, from text or from an object', () => {
        const text = postmanBodyOf({
            mode: 'graphql',
            graphql: { query: 'q', variables: '{"a":1}' },
        });
        const object = postmanBodyOf({
            mode: 'graphql',
            graphql: { query: 'q', variables: { a: 1 } },
        });
        const none = postmanBodyOf({ mode: 'graphql' });

        expect(text.body).toMatchObject({
            contentType: 'application/graphql',
            value: 'q',
            variables: '{"a":1}',
        });
        expect(object.body?.variables).toBe('{\n  "a": 1\n}');
        expect(none.body).toMatchObject({ value: '', variables: '' });
        expect(
            postmanBodyOf({ mode: 'graphql', graphql: { variables: null } }).body?.variables,
        ).toBe('');
    });

    it('says a mode Mandor does not know was lost, by name', () => {
        expect(postmanBodyOf({ mode: 'binary' })).toEqual({ lost: 'bodyMode:binary' });
        expect(postmanBodyOf({ mode: 'constructor' })).toEqual({ lost: 'bodyMode:constructor' });
    });
});
