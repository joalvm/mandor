import { httpResponseSchema } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import {
    bodyFileName,
    bodyKindOf,
    contentTypeOf,
    responseKindOf,
} from '../../../src/renderer/response/lib/body-views.js';

const SHA = 'a'.repeat(64);

function responseWith(body: unknown, headers: [string, string][] = []) {
    return httpResponseSchema.parse({
        status: 200,
        statusText: 'OK',
        httpVersion: '1.1',
        headers,
        body,
        sizes: { transferredBytes: 0, bodyBytes: 0, decoded: true },
        timings: { dnsMs: 0, connectMs: 0, tlsMs: 0, firstByteMs: 0, totalMs: 0, viaProxy: false },
        redirects: [],
        cookies: [],
    });
}

describe('contentTypeOf', () => {
    it('reads the header whatever its case, without its parameters', () => {
        const response = responseWith(null, [['Content-Type', 'Application/JSON; charset=utf-8']]);

        expect(contentTypeOf(response)).toBe('application/json');
    });

    it('is empty when the server named no type', () => {
        expect(contentTypeOf(responseWith(null))).toBe('');
    });

    it('takes the type of a body on disk from the body, which kept it', () => {
        const stored = { bytes: 9, contentType: 'image/png', kind: 'stored', ref: SHA };

        expect(contentTypeOf(responseWith(stored, [['content-type', 'text/plain']]))).toBe(
            'image/png',
        );
    });
});

describe('bodyKindOf', () => {
    it.each([
        ['image/png', 'image'],
        ['application/problem+json', 'json'],
        ['text/html', 'html'],
        ['application/atom+xml', 'xml'],
        ['text/plain', 'text'],
        ['application/javascript', 'javascript'],
        ['text/markdown', 'markdown'],
        ['image/svg+xml', 'image'],
    ] as const)('trusts %s to be %s', (type, kind) => {
        expect(bodyKindOf(type, '{"a":1}')).toBe(kind);
    });

    it('reads the body when the type says nothing', () => {
        expect(bodyKindOf('', '{"a":1}')).toBe('json');
        expect(bodyKindOf('application/octet-stream', '<note>x</note>')).toBe('xml');
    });

    it('reads the body when the type is one nobody here knows', () => {
        expect(bodyKindOf('application/x-thing', 'plain words')).toBe('text');
    });

    it('calls binary what never was text', () => {
        expect(bodyKindOf('', null)).toBe('binary');
    });
});

describe('responseKindOf', () => {
    it('guesses from the text the window holds, and leaves bytes to the type', () => {
        const text = { encoding: 'utf8', kind: 'inline', text: '{"a":1}' };
        const bytes = { data: 'AQID', encoding: 'base64', kind: 'inline' };

        expect(responseKindOf(responseWith(text))).toBe('json');
        expect(responseKindOf(responseWith(bytes))).toBe('binary');
    });
});

describe('bodyFileName', () => {
    it.each([
        ['application/json', 'json', 'response.json'],
        ['text/html', 'html', 'response.html'],
        ['application/xml', 'xml', 'response.xml'],
        ['text/plain', 'text', 'response.txt'],
        ['text/javascript', 'javascript', 'response.js'],
        ['text/markdown', 'markdown', 'response.md'],
        ['', 'binary', 'response.bin'],
        ['image/png', 'image', 'response.png'],
        ['image/svg+xml', 'image', 'response.svg'],
        ['image/', 'image', 'response.bin'],
    ] as const)('names a %s body of %s %s', (type, kind, name) => {
        expect(bodyFileName(type, kind)).toBe(name);
    });
});
