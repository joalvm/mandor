import type { RequestBody } from '@mandor/schema';
import { withoutShellEscapes } from './shell-escapes.js';

const FORM_CHUNK = /^[^=\r\n]+=[^\r\n]*$/;
const URLENCODED = 'application/x-www-form-urlencoded';

/** The headers `--json` adds, if the person wrote none of them. */
const JSON_HEADERS: [string, string][] = [
    ['Content-Type', 'application/json'],
    ['Accept', 'application/json'],
];

function looksLikeForm(text: string): boolean {
    return !/^\s*[{[<]/.test(text) && text.split('&').every((chunk) => FORM_CHUNK.test(chunk));
}

function isJson(baseType: string): boolean {
    return baseType === 'application/json' || baseType.endsWith('+json');
}

function isXml(baseType: string): boolean {
    return ['application/xml', 'text/xml'].includes(baseType) || baseType.endsWith('+xml');
}

/**
 * The body as the type says it is, from the text that was sent. `headers` are what the body
 * implies and the person may not have written: what `--json` adds, or the type curl sends for
 * data when it is told none.
 */
export function typedBody(input: { text: string; json: boolean; contentType: string }): {
    body: RequestBody;
    headers: [string, string][];
} {
    const { text } = input;
    const baseType = input.contentType.replace(/;.*/s, '').trim().toLowerCase();

    if (input.json) {
        return { body: { type: 'json', content: text }, headers: JSON_HEADERS };
    }

    if (isJson(baseType)) {
        return { body: { type: 'json', content: text }, headers: [] };
    }

    if (isXml(baseType)) {
        return { body: { type: 'xml', content: text }, headers: [] };
    }

    if ((baseType === '' || baseType === URLENCODED) && looksLikeForm(text)) {
        const fields = [...new URLSearchParams(withoutShellEscapes(text))].map(([key, value]) => ({
            key,
            value,
            enabled: true,
        }));

        return { body: { type: 'urlencoded', fields }, headers: [] };
    }

    const headers: [string, string][] = baseType === '' ? [['Content-Type', URLENCODED]] : [];

    return { body: { type: 'text', content: text }, headers };
}
