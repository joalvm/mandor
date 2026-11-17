import { describe, expect, it } from 'vitest';

import {
    BYTE_FORMATS,
    defaultFormatOf,
    languageOfBodyFormat,
    previewableOf,
    previewsFirst,
    TEXT_FORMATS,
} from '../../../src/renderer/response/lib/body-formats.js';

describe('body-formats', () => {
    it('opens a body on its own language, its text, or its bytes', () => {
        expect(defaultFormatOf('json')).toBe('json');
        expect(defaultFormatOf('html')).toBe('html');
        expect(defaultFormatOf('text')).toBe('raw');
        expect(defaultFormatOf('binary')).toBe('hex');
        expect(defaultFormatOf('image')).toBe('hex');
    });

    it('draws a page and an image, and a JSON document only when it is laid out', () => {
        expect(previewableOf('html', false)).toBe(true);
        expect(previewableOf('image', false)).toBe(true);
        expect(previewableOf('json', true)).toBe(true);
        expect(previewableOf('json', false)).toBe(false);
        expect(previewableOf('xml', true)).toBe(false);
        expect(previewableOf('binary', true)).toBe(false);
    });

    it('opens an image drawn and nothing else', () => {
        expect(previewsFirst('image')).toBe(true);
        expect(previewsFirst('html')).toBe(false);
    });

    it('colours a format in its language, and nothing past the size it lays out', () => {
        expect(languageOfBodyFormat('json', true)).toBe('jsonc');
        expect(languageOfBodyFormat('html', true)).toBe('html');
        expect(languageOfBodyFormat('hex', true)).toBe('plaintext');
        expect(languageOfBodyFormat('json', false)).toBe('plaintext');
    });

    it('offers the text formats apart from the byte formats', () => {
        expect(TEXT_FORMATS).toContain('markdown');
        expect(BYTE_FORMATS).toEqual(['raw', 'hex', 'base64']);
    });
});
