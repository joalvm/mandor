import { describe, expect, it } from 'vitest';

import { curlBody } from '../../src/curl/curl-body.js';
import type { BodyPart } from '../../src/curl/curl-body-part.js';

function data(value: string, kind: BodyPart['kind'] = 'data'): BodyPart {
    return {
        flag: '-d',
        kind,
        value,
    };
}

function header(key: string, value: string) {
    return { key, value, enabled: true };
}

describe('the body a curl command describes', () => {
    it('has none when no option names one', () => {
        expect(curlBody({ parts: [], get: false, headers: [] })).toEqual({
            body: { type: 'none' },
            headers: [],
            query: [],
            notices: [],
        });
    });

    it('joins the parts with an ampersand', () => {
        const { body } = curlBody({
            parts: [data('a=1'), data('b=2', 'raw')],
            get: false,
            headers: [],
        });

        expect(body).toEqual({
            type: 'urlencoded',
            fields: [
                { key: 'a', value: '1', enabled: true },
                { key: 'b', value: '2', enabled: true },
            ],
        });
    });

    it('joins several --json parts with nothing between them', () => {
        const { body } = curlBody({
            parts: [data('{"a":', 'json'), data('1}', 'json')],
            get: false,
            headers: [],
        });

        expect(body).toEqual({ type: 'json', content: '{"a":1}' });
    });

    it('adds the headers --json brings only where the person wrote none', () => {
        const none = curlBody({ parts: [data('{}', 'json')], get: false, headers: [] });
        const some = curlBody({
            parts: [data('{}', 'json')],
            get: false,
            headers: [header('accept', 'text/plain')],
        });

        expect(none.headers).toEqual([
            header('Content-Type', 'application/json'),
            header('Accept', 'application/json'),
        ]);
        expect(some.headers).toEqual([header('Content-Type', 'application/json')]);
    });

    it('types the body by the Content-Type the person wrote', () => {
        const { body, headers } = curlBody({
            parts: [data('{"a":1}')],
            get: false,
            headers: [header('Content-Type', 'application/json')],
        });

        expect(body).toEqual({ type: 'json', content: '{"a":1}' });
        expect(headers).toEqual([]);
    });

    it('says the Content-Type curl sends for a body of plain text', () => {
        const { body, headers } = curlBody({ parts: [data('hello')], get: false, headers: [] });

        expect(body).toEqual({ type: 'text', content: 'hello' });
        expect(headers).toEqual([header('Content-Type', 'application/x-www-form-urlencoded')]);
    });

    it('encodes --data-urlencode and keeps the placeholders', () => {
        const { body } = curlBody({
            parts: [data('q=a b {{x}}', 'urlencode')],
            get: false,
            headers: [],
        });

        expect(body).toEqual({
            type: 'urlencoded',
            fields: [{ key: 'q', value: 'a b {{x}}', enabled: true }],
        });
    });

    it('moves the data to the query with -G', () => {
        expect(curlBody({ parts: [data('a=1&b=x%20y')], get: true, headers: [] })).toEqual({
            body: { type: 'none' },
            headers: [],
            query: [
                { key: 'a', value: '1', enabled: true },
                { key: 'b', value: 'x y', enabled: true },
            ],
            notices: [],
        });
    });

    it('turns a single file of the repo into a binary body and asks to copy it', () => {
        expect(curlBody({ parts: [data('@payload.bin')], get: false, headers: [] })).toEqual({
            body: { type: 'binary', file: 'payload.bin' },
            headers: [header('Content-Type', 'application/x-www-form-urlencoded')],
            query: [],
            notices: [{ code: 'dataFileCopy', subject: 'payload.bin' }],
        });
    });

    it('says application/json for a file sent by --json, unless the person wrote a type', () => {
        const none = curlBody({ parts: [data('@a.json', 'json')], get: false, headers: [] });
        const some = curlBody({
            parts: [data('@a.json', 'json')],
            get: false,
            headers: [header('content-type', 'text/plain')],
        });

        expect(none.headers).toEqual([header('Content-Type', 'application/json')]);
        expect(some.headers).toEqual([]);
    });

    it.each([
        ['standard input', [data('@-')], false],
        ['a path outside the repo', [data('@/etc/hosts')], false],
        ['a file next to other parts', [data('@a.txt'), data('b=1')], false],
        ['a file with -G', [data('@a.txt')], true],
    ])('leaves out the file of %s', (_name, parts, get) => {
        const { body, notices } = curlBody({ parts, get, headers: [] });

        expect(body.type).not.toBe('binary');
        expect(notices.every((notice) => notice.code === 'dataFile')).toBe(true);
        expect(notices).toHaveLength(1);
    });

    it('keeps the text parts when a file is left out', () => {
        const { body } = curlBody({
            parts: [data('@-'), data('b=1')],
            get: false,
            headers: [],
        });

        expect(body).toEqual({
            type: 'urlencoded',
            fields: [{ key: 'b', value: '1', enabled: true }],
        });
    });

    it('has no body when the only part is a file left out', () => {
        expect(curlBody({ parts: [data('@-')], get: false, headers: [] }).body).toEqual({
            type: 'none',
        });
    });

    it('keeps the form and says so when data comes with it', () => {
        const form: BodyPart = { flag: '-F', kind: 'form', value: 'a=1' };
        const { body, notices } = curlBody({ parts: [data('b=2'), form], get: false, headers: [] });

        expect(body.type).toBe('form');
        expect(notices).toEqual([{ code: 'mixedBody' }]);
    });

    it('says nothing about a form alone', () => {
        const form: BodyPart = { flag: '-F', kind: 'form', value: 'a=1' };

        expect(curlBody({ parts: [form], get: false, headers: [] }).notices).toEqual([]);
    });
});
