import { describe, expect, it } from 'vitest';

import { languageOfFormat } from '../../src/editor/editor-language.js';

describe('the language a payload is shown in', () => {
    /** A received frame has no comments, and a payload being written may: one language reads both. */
    it('shows json as jsonc', () => {
        expect(languageOfFormat('json')).toBe('jsonc');
    });

    it('shows xml and html as themselves', () => {
        expect(languageOfFormat('xml')).toBe('xml');
        expect(languageOfFormat('html')).toBe('html');
    });

    it('shows bytes as a dump of them', () => {
        expect(languageOfFormat('binary')).toBe('binary');
    });

    it('shows anything else as plain text', () => {
        expect(languageOfFormat('text')).toBe('plaintext');
    });
});
