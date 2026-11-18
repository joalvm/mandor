import { describe, expect, it } from 'vitest';

import { exampleLanguageOf } from '../../../../src/renderer/features/requests/lib/example-language.js';

describe('the language an example is read in', () => {
    it('follows the type of content the document says it has', () => {
        expect(exampleLanguageOf('application/json')).toBe('jsonc');
        expect(exampleLanguageOf('application/problem+json; charset=utf-8')).toBe('jsonc');
        expect(exampleLanguageOf('Application/XML')).toBe('xml');
        expect(exampleLanguageOf('text/html')).toBe('html');
        expect(exampleLanguageOf('text/plain')).toBe('plaintext');
        expect(exampleLanguageOf('')).toBe('plaintext');
    });
});
