import { describe, expect, it } from 'vitest';

import { BrunoParseError } from '../../../src/bruno/document/bruno-parse-error.js';
import type { BrunoSkipped } from '../../../src/bruno/document/bruno-tree.js';
import { requestOfBru } from '../../../src/bruno/document/read-bru-request.js';
import { bodyNode, requestNode } from '../support/trees.js';

function file(path: string, text: string) {
    return { path, text };
}

describe('requestOfBru', () => {
    it('reads an HTTP request with its rows, body, auth and notes', () => {
        const text = [
            'meta {',
            '  name: Alta',
            '  type: http',
            '  seq: 2',
            '}',
            '',
            'post {',
            '  url: https://api.test/pets/:id?q=1',
            '  body: json',
            '  auth: bearer',
            '}',
            '',
            'params:query {',
            '  q: 1',
            '}',
            '',
            'params:path {',
            '  id: 7',
            '}',
            '',
            'headers {',
            '  X: 1',
            '}',
            '',
            'auth:bearer {',
            '  token: t',
            '}',
            '',
            'body:json {',
            '  {}',
            '}',
            '',
            'docs {',
            '  Una nota',
            '}',
            '',
        ].join('\n');
        const skipped: BrunoSkipped[] = [];

        expect(requestOfBru(file('Alta.bru', text), skipped)).toEqual([
            requestNode({
                name: 'Alta',
                seq: 2,
                method: 'POST',
                url: 'https://api.test/pets/:id?q=1',
                description: 'Una nota',
                headers: [{ name: 'X', value: '1', disabled: false }],
                params: [{ name: 'q', value: '1', disabled: false }],
                pathParams: [{ name: 'id', value: '7', disabled: false }],
                body: bodyNode('json', { text: '{}' }),
                auth: { type: 'bearer', token: 't' },
            }),
        ]);
        expect(skipped).toEqual([]);
    });

    it('reads a GraphQL request as a request', () => {
        const text =
            'meta {\n  name: G\n  type: graphql\n}\n\npost {\n  url: u\n  body: graphql\n}\n';

        expect(requestOfBru(file('G.bru', text), [])).toMatchObject([
            { name: 'G', method: 'POST', url: 'u' },
        ]);
    });

    it('names a request as its file when it names none, and takes GET when it names no method', () => {
        expect(requestOfBru(file('Mascotas/Sin nombre.bru', ''), [])).toMatchObject([
            { name: 'Sin nombre', method: 'GET', url: '', seq: Number.MAX_SAFE_INTEGER },
        ]);
    });

    it('names what the request keeps that Mandor has no place for', () => {
        const text = [
            'meta {',
            '  name: A',
            '  type: http',
            '  tags: [',
            '    smoke',
            '  ]',
            '}',
            '',
            'get {',
            '  url: u',
            '}',
            '',
            'vars:pre-request {',
            '  a: 1',
            '}',
            '',
            'assert {',
            '  res.status: eq 200',
            '}',
            '',
            'tests {',
            '  test(1)',
            '}',
            '',
            'script:pre-request {',
            '  x()',
            '}',
            '',
        ].join('\n');

        expect(requestOfBru(file('A.bru', text), [])).toMatchObject([
            {
                tags: ['smoke'],
                scripts: {
                    onBeforeRequest: { source: 'x()' },
                    onResponse: { source: 'test(1)' },
                },
                leftOut: ['assertions', 'request variables'],
            },
        ]);
    });

    it('leaves out a request of a kind that is not HTTP and says what it was', () => {
        const skipped: BrunoSkipped[] = [];
        const text = 'meta {\n  name: Feed\n  type: grpc\n}\n\ngrpc {\n  url: x\n}\n';

        expect(requestOfBru(file('Feed.bru', text), skipped)).toEqual([]);
        expect(skipped).toEqual([{ kind: 'grpc', name: 'Feed' }]);
    });

    it('says which file the parser refused', () => {
        expect(() => requestOfBru(file('Mal.bru', 'this is not bru'), [])).toThrow(
            new BrunoParseError(['Mal.bru: Line 1, col 1:']),
        );
    });

    it('reads the settings and the examples the file keeps', () => {
        const text = [
            'meta {',
            '  name: A',
            '  type: http',
            '  seq: 1',
            '}',
            '',
            'get {',
            '  url: http://x/a',
            '  body: none',
            '  auth: none',
            '}',
            '',
            'settings {',
            '  timeout: 5',
            '  followRedirects: false',
            '}',
            '',
            'example {',
            '  name: Ok',
            '',
            '  request: {',
            '    url: http://x/a',
            '    method: get',
            '  }',
            '',
            '  response: {',
            '    status: {',
            '      code: 201',
            '      text: Created',
            '    }',
            '    body: {',
            '      type: text',
            "      content: '''",
            '        hola',
            "      '''",
            '    }',
            '  }',
            '}',
        ].join('\n');

        expect(requestOfBru(file('a.bru', text), [])).toMatchObject([
            {
                settings: { timeout: 5, followRedirects: false },
                examples: [{ name: 'Ok', status: '201', bodyType: 'text', body: 'hola' }],
                leftOut: [],
            },
        ]);
    });
});
