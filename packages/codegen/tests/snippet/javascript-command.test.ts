import { describe, expect, it } from 'vitest';

import { javascriptCommandOf } from '../../src/snippet/javascript-command.js';
import type { SnippetRequest } from '../../src/snippet/snippet-request.js';

const get: SnippetRequest = {
    method: 'GET',
    url: 'https://h.example.test/s?q=a%20b',
    headers: [['Accept', 'application/json']],
    body: { type: 'none' },
};

describe('the JavaScript a request is copied as', () => {
    /**
     * A collection pulled from someone else names the values. A backslash before a quote, left
     * as it came, closes the literal and runs what follows: every value goes as JSON writes a
     * string, which escapes every quote, backslash and control character.
     */
    it.each(['fetch', 'axios'] as const)(
        'keeps a hostile value inside its literal in %s',
        (client) => {
            const evil = '\\\\\'+(globalThis.x=1)//"`${y}`\u2028';
            const code = javascriptCommandOf(
                {
                    method: 'POST',
                    url: 'https://h.example.test/p',
                    headers: [['X-Evil', evil]],
                    body: { type: 'text', contentType: 'text/plain', text: evil },
                },
                client,
            );

            expect(code).toContain(`"X-Evil": ${JSON.stringify(evil)}`);
            expect(code).toContain(`: ${JSON.stringify(evil)}\n};`);
        },
    );

    it('writes a GET with fetch', () => {
        expect(javascriptCommandOf(get, 'fetch')).toBe(
            [
                'const options = {',
                '  method: "GET",',
                '  headers: {',
                '    "Accept": "application/json"',
                '  }',
                '};',
                '',
                'const response = await fetch("https://h.example.test/s?q=a%20b", options);',
                '',
                'console.log(await response.text());',
            ].join('\n'),
        );
    });

    it('writes a GET with axios, the URL among the options', () => {
        expect(javascriptCommandOf({ ...get, headers: [] }, 'axios')).toBe(
            [
                'import axios from "axios";',
                '',
                'const options = {',
                '  method: "GET",',
                '  url: "https://h.example.test/s?q=a%20b"',
                '};',
                '',
                'const response = await axios.request(options);',
                '',
                'console.log(response.data);',
            ].join('\n'),
        );
    });

    it('sends a text body as typed and says its type unless the request already did', () => {
        const json = { type: 'text', contentType: 'application/json', text: '{"a":1}' } as const;
        const code = javascriptCommandOf(
            { ...get, method: 'POST', headers: [], body: json },
            'fetch',
        );
        const named = javascriptCommandOf(
            {
                ...get,
                method: 'POST',
                headers: [['content-type', 'application/vnd.api+json']],
                body: json,
            },
            'axios',
        );

        expect(code).toContain('    "Content-Type": "application/json"');
        expect(code).toContain('  body: "{\\"a\\":1}"');
        expect(named).toContain('    "content-type": "application/vnd.api+json"');
        expect(named).not.toContain('"Content-Type"');
        expect(named).toContain('  data: "{\\"a\\":1}"');
    });

    it('sends a urlencoded body as its fields, a name given twice kept twice', () => {
        const code = javascriptCommandOf(
            {
                ...get,
                method: 'PUT',
                headers: [],
                body: {
                    type: 'urlencoded',
                    fields: [
                        ['a', '1'],
                        ['a', 'x y'],
                    ],
                },
            },
            'fetch',
        );

        expect(code).toContain('  body: new URLSearchParams([["a","1"],["a","x y"]])');
    });

    it('sends a form with each file read from its path, and never a boundary of its own', () => {
        const code = javascriptCommandOf(
            {
                ...get,
                method: 'POST',
                headers: [['Content-Type', 'multipart/form-data; boundary=x']],
                body: {
                    type: 'form',
                    fields: [
                        { name: 'a', value: '1', kind: 'text' },
                        { name: 'doc', value: 'C:\\in\\report.pdf', kind: 'file' },
                        { name: 'pic', value: 'img/me.png', kind: 'file' },
                    ],
                },
            },
            'axios',
        );

        expect(code).toBe(
            [
                'import axios from "axios";',
                'import { openAsBlob } from "node:fs";',
                '',
                'const form = new FormData();',
                'form.append("a", "1");',
                'form.append("doc", await openAsBlob("C:\\\\in\\\\report.pdf"), "report.pdf");',
                'form.append("pic", await openAsBlob("img/me.png"), "me.png");',
                '',
                'const options = {',
                '  method: "POST",',
                '  url: "https://h.example.test/s?q=a%20b",',
                '  data: form',
                '};',
                '',
                'const response = await axios.request(options);',
                '',
                'console.log(response.data);',
            ].join('\n'),
        );
    });

    it('reads nothing from disk when the form has no file', () => {
        const code = javascriptCommandOf(
            {
                ...get,
                method: 'POST',
                headers: [],
                body: { type: 'form', fields: [{ name: 'a', value: '1', kind: 'text' }] },
            },
            'fetch',
        );

        expect(code).not.toContain('openAsBlob');
        expect(code.startsWith('const form = new FormData();\n')).toBe(true);
        expect(code).toContain('  body: form\n');
    });

    it('joins the values of a header named twice, which an object would lose', () => {
        const code = javascriptCommandOf(
            {
                ...get,
                headers: [
                    ['Accept', 'text/html'],
                    ['accept', 'application/json'],
                ],
            },
            'fetch',
        );

        expect(code).toContain('    "Accept": "text/html, application/json"');
    });
});
