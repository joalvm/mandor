import { describe, expect, it } from 'vitest';

import { DROPPED_HEADERS, operationOf } from '../../../src/har/import/entry-operation.js';
import { entryOf } from '../support/fixture.js';

const URL_OF = new URL('https://api.example.test/users?page=1&sort=name');
const OK = {
    status: 200,
    statusText: 'OK',
    headers: [],
    content: { mimeType: 'application/json', text: '{}' },
};

function operation(
    entries: Parameters<typeof operationOf>[0]['entries'],
): ReturnType<typeof operationOf> {
    return operationOf({ entries, url: URL_OF, method: 'GET', summary: 'GET /users' });
}

/** The same request recorded `count` times, each time answered 200. */
function answered(count: number): Parameters<typeof operationOf>[0]['entries'] {
    const again = (): ReturnType<typeof entryOf> => entryOf('GET', URL_OF.href, { response: OK });

    return [again(), ...Array.from({ length: count - 1 }, again)];
}

describe('operationOf', () => {
    it('names the operation by host and summary, in the folder of its host', () => {
        const result = operation([entryOf('GET', URL_OF.href, { response: OK })]);

        expect(result).toMatchObject({
            name: 'api.example.test / GET /users',
            channel: 'api.example.test / GET /users',
            direction: 'outgoing',
            security: [],
            http: {
                method: 'GET',
                path: '',
                url: 'https://api.example.test/users',
                group: ['api.example.test'],
                summary: 'GET /users',
                security: null,
            },
            extras: {},
        });
    });

    it('turns the query into rows that are on, before the headers', () => {
        const result = operation([
            entryOf('GET', URL_OF.href, {
                request: { headers: [{ name: 'Accept', value: '*/*' }] },
            }),
        ]);

        expect(result.http?.parameters).toEqual([
            { name: 'page', in: 'query', required: false, value: '1', enabled: true },
            { name: 'sort', in: 'query', required: false, value: 'name', enabled: true },
            { name: 'Accept', in: 'header', required: false, value: '*/*', enabled: true },
        ]);
    });

    it('leaves out the headers the transport writes itself and keeps the credentials', () => {
        const headers = [
            { name: ':authority', value: 'api.example.test' },
            ...DROPPED_HEADERS.map((name) => ({ name: name.toUpperCase(), value: 'x' })),
            { name: 'Authorization', value: 'Bearer abc' },
        ];
        const result = operation([entryOf('GET', URL_OF.href, { request: { headers } })]);

        expect(result.http?.parameters.filter((each) => each.in === 'header')).toEqual([
            {
                name: 'Authorization',
                in: 'header',
                required: false,
                value: 'Bearer abc',
                enabled: true,
            },
        ]);
    });

    it('takes the request and the body of the first entry', () => {
        const result = operation([
            entryOf('GET', URL_OF.href, {
                request: { postData: { mimeType: 'application/json', text: '{"a":1}' } },
            }),
            entryOf('GET', URL_OF.href, {
                request: { headers: [{ name: 'X-Later', value: '1' }] },
            }),
        ]);

        expect(result.http?.requestBody?.value).toBe('{"a":1}');
        expect(result.http?.parameters.some((each) => each.name === 'X-Later')).toBe(false);
    });

    it('merges the entries that repeat it and keeps their answers as examples', () => {
        const result = operation([
            entryOf('GET', URL_OF.href, { response: OK }),
            entryOf('GET', URL_OF.href, {
                response: { ...OK, status: 304, statusText: 'Not Modified' },
            }),
        ]);

        expect(result.extras).toEqual({ mergedEntries: 1 });
        expect(result.http?.responses.map((each) => each.name)).toEqual([
            '200 OK',
            '304 Not Modified',
        ]);
    });

    it('numbers the examples that share a name', () => {
        expect(operation(answered(3)).http?.responses.map((each) => each.name)).toEqual([
            '200 OK',
            '200 OK (2)',
            '200 OK (3)',
        ]);
    });

    it('keeps five examples and counts the rest', () => {
        const result = operation(answered(7));

        expect(result.http?.responses).toHaveLength(5);
        expect(result.extras).toEqual({ mergedEntries: 6, droppedExamples: 2 });
    });

    it('skips the entries that have no answer or a failed one', () => {
        const result = operation([
            entryOf('GET', URL_OF.href),
            entryOf('GET', URL_OF.href, { response: { ...OK, status: 0, statusText: '' } }),
            entryOf('GET', URL_OF.href, { response: { status: 204 } }),
        ]);

        expect(result.http?.responses).toEqual([
            { name: '204', status: '204', contentType: '', body: '' },
        ]);
    });

    it('takes the type of an example from its header before the content', () => {
        const result = operation([
            entryOf('GET', URL_OF.href, {
                response: {
                    ...OK,
                    headers: [{ name: 'Content-Type', value: 'Text/HTML; charset=utf-8' }],
                },
            }),
            entryOf('GET', URL_OF.href, { response: OK }),
        ]);

        expect(result.http?.responses.map((each) => each.contentType)).toEqual([
            'text/html',
            'application/json',
        ]);
    });

    it('names the examples whose body was bytes', () => {
        const png = { mimeType: 'image/png', encoding: 'base64', text: 'iVBORw0KGgo=' };
        const result = operation([
            entryOf('GET', URL_OF.href, { response: { ...OK, content: png } }),
            entryOf('GET', URL_OF.href, { response: OK }),
        ]);

        expect(result.extras).toEqual({ mergedEntries: 1, binaryExamples: ['200 OK'] });
        expect(result.http?.responses[0]?.body).toBe('');
    });

    it('says the type of a request body that was bytes', () => {
        const result = operation([
            entryOf('GET', URL_OF.href, {
                request: { postData: { mimeType: 'application/octet-stream', text: 'xx' } },
            }),
        ]);

        expect(result.extras).toEqual({ binaryBody: 'application/octet-stream' });
    });
});
