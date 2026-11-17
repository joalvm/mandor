import { describe, expect, it } from 'vitest';

import { powershellCommandOf } from '../../src/snippet/powershell-command.js';
import type { SnippetRequest } from '../../src/snippet/snippet-request.js';

const get: SnippetRequest = {
    method: 'GET',
    url: 'https://h.example.test/s?q=a%20b',
    headers: [['Accept', 'application/json']],
    body: { type: 'none' },
};

describe('the PowerShell a request is copied as', () => {
    /**
     * A collection pulled from someone else names the values. A double-quoted string runs a
     * `$(…)` inside it, and a quote of the value's own would close the literal: every value goes
     * in single quotes, its quotes doubled, the typographic ones PowerShell takes for `'` too.
     */
    it('keeps a hostile value inside its literal, where nothing in it runs', () => {
        const evil = 'a\'b‘c$(whoami)`"d';
        const code = powershellCommandOf({
            method: 'POST',
            url: "https://h.example.test/it's",
            headers: [['X-Evil', evil]],
            body: { type: 'text', contentType: 'text/plain', text: evil },
        });
        const literal = "'a''b‘‘c$(whoami)`\"d'";

        expect(code).toContain(`$headers.Add('X-Evil', ${literal})`);
        expect(code).toContain(`-Body ${literal}`);
        expect(code).toContain("-Uri 'https://h.example.test/it''s'");
        expect(code.replaceAll(literal, '')).not.toContain('"');
    });

    it('writes a GET with its headers and no body', () => {
        expect(powershellCommandOf(get)).toBe(
            [
                '$headers = @{}',
                "$headers.Add('Accept', 'application/json')",
                "$response = Invoke-WebRequest -Uri 'https://h.example.test/s?q=a%20b' -Method 'GET' -Headers $headers",
            ].join('\n'),
        );
    });

    it('leaves the headers out when there are none', () => {
        expect(powershellCommandOf({ ...get, headers: [] })).toBe(
            "$response = Invoke-WebRequest -Uri 'https://h.example.test/s?q=a%20b' -Method 'GET'",
        );
    });

    it('says the type of a text body with -ContentType, not as a header', () => {
        const code = powershellCommandOf({
            ...get,
            method: 'POST',
            headers: [['content-type', 'application/json; charset=utf-8']],
            body: { type: 'text', contentType: 'application/json', text: '{"a":1}' },
        });

        expect(code).toContain("-ContentType 'application/json; charset=utf-8' -Body '{\"a\":1}'");
        expect(code).not.toContain('$headers');
    });

    it('encodes the fields of a urlencoded body', () => {
        const code = powershellCommandOf({
            ...get,
            method: 'PUT',
            headers: [],
            body: {
                type: 'urlencoded',
                fields: [
                    ['a', '1'],
                    ['b', 'x y&z'],
                ],
            },
        });

        expect(code).toContain(
            "-ContentType 'application/x-www-form-urlencoded' -Body 'a=1&b=x%20y%26z'",
        );
    });

    it('sends a form with -Form, a file read from its path, and never a boundary of its own', () => {
        const code = powershellCommandOf({
            ...get,
            method: 'POST',
            headers: [['Content-Type', 'multipart/form-data; boundary=x']],
            body: {
                type: 'form',
                fields: [
                    { name: 'a', value: '1', kind: 'text' },
                    { name: 'a', value: '2', kind: 'text' },
                    { name: 'doc', value: "my 'report'.pdf", kind: 'file' },
                ],
            },
        });

        expect(code).toBe(
            [
                '$form = @{',
                "    'a' = @('1', '2')",
                "    'doc' = Get-Item -LiteralPath 'my ''report''.pdf'",
                '}',
                "$response = Invoke-WebRequest -Uri 'https://h.example.test/s?q=a%20b' -Method 'POST' -Form $form",
            ].join('\n'),
        );
    });

    it('keeps each file of a name given twice apart from the next one', () => {
        const code = powershellCommandOf({
            ...get,
            method: 'POST',
            headers: [],
            body: {
                type: 'form',
                fields: [
                    { name: 'doc', value: 'a.pdf', kind: 'file' },
                    { name: 'doc', value: 'b.pdf', kind: 'file' },
                ],
            },
        });

        expect(code).toContain(
            "    'doc' = @((Get-Item -LiteralPath 'a.pdf'), (Get-Item -LiteralPath 'b.pdf'))",
        );
    });

    /** A hashtable refuses a key it already holds, whatever its case: one header, its values joined. */
    it('joins the values of a header named twice', () => {
        const code = powershellCommandOf({
            ...get,
            headers: [
                ['Accept', 'text/html'],
                ['accept', 'application/json'],
            ],
        });

        expect(code).toContain("$headers.Add('Accept', 'text/html, application/json')");
    });

    it('sends a method PowerShell does not list with -CustomMethod', () => {
        expect(powershellCommandOf({ ...get, method: 'PURGE' })).toContain("-CustomMethod 'PURGE'");
    });
});
