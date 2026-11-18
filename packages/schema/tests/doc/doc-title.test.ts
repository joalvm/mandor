import { describe, expect, it } from 'vitest';

import { docFileName, docTitle } from '../../src/index.js';

describe('the two spellings of a doc name', () => {
    it('drops the extension the list never shows', () => {
        expect(docTitle('guia-de-integracion.md')).toBe('guia-de-integracion');
    });

    it('leaves a name that carries no extension exactly as it is', () => {
        expect(docTitle('guia-de-integracion')).toBe('guia-de-integracion');
    });

    /** A dot inside the title is a dot of the title: only the last `.md` is the extension. */
    it('keeps the dots a person wrote in the middle of a title', () => {
        expect(docTitle('v1.2 de la api.md')).toBe('v1.2 de la api');
    });

    it('spells the file of a title a person typed', () => {
        expect(docFileName('Notas de la API')).toBe('Notas de la API.md');
    });

    /** A person who types the extension means the file, not a file called `notas.md.md`. */
    it('does not add a second extension to a title that already carries one', () => {
        expect(docFileName('notas.md')).toBe('notas.md');
    });

    it('trims what was typed before it spells the file', () => {
        expect(docFileName('  notas  ')).toBe('notas.md');
    });
});
