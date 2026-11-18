import { describe, expect, it } from 'vitest';

import { docTextWith } from '../../src/doc/doc-text-with.js';

describe('writing the body of a doc', () => {
    it('keeps the front matter as it was', () => {
        const text = '---\n# la nota\nauthor: Ana\ntitle: Notas\n---\nViejo\n';

        expect(docTextWith(text, { body: 'Nuevo\n' })).toBe(
            '---\n# la nota\nauthor: Ana\ntitle: Notas\n---\nNuevo\n',
        );
    });

    it('writes a doc with no front matter as plain markdown', () => {
        expect(docTextWith('Viejo\n', { body: 'Nuevo\n' })).toBe('Nuevo\n');
    });

    it('keeps a block that is not front matter as part of what the body replaces', () => {
        expect(docTextWith('---\ntitle: [roto\n---\nViejo\n', { body: 'Nuevo\n' })).toBe('Nuevo\n');
    });
});

describe('writing the title of a doc', () => {
    it('opens the front matter of a doc that had none, and keeps its body', () => {
        expect(docTextWith('# Hola\n', { title: 'Notas' })).toBe(
            '---\ntitle: Notas\n---\n# Hola\n',
        );
    });

    it('starts a doc from nothing with only its title', () => {
        expect(docTextWith('', { title: 'Notas' })).toBe('---\ntitle: Notas\n---\n');
    });

    it('replaces the title and keeps the other keys and the comments', () => {
        const text = '---\n# la nota\nauthor: Ana\ntitle: Notas\n---\nCuerpo\n';

        expect(docTextWith(text, { title: 'Ideas' })).toBe(
            '---\n# la nota\nauthor: Ana\ntitle: Ideas\n---\nCuerpo\n',
        );
    });

    it('adds the title to a front matter that had none', () => {
        expect(docTextWith('---\nauthor: Ana\n---\nCuerpo\n', { title: 'Notas' })).toBe(
            '---\nauthor: Ana\ntitle: Notas\n---\nCuerpo\n',
        );
    });

    it('quotes a title that yaml would read as something else', () => {
        const text = docTextWith('', { title: 'a: b' });

        expect(text).toBe('---\ntitle: "a: b"\n---\n');
    });

    it('writes title and body together', () => {
        expect(
            docTextWith('---\ntitle: Notas\n---\nViejo\n', { title: 'Ideas', body: 'Nuevo\n' }),
        ).toBe('---\ntitle: Ideas\n---\nNuevo\n');
    });

    it('changes nothing when the patch is empty', () => {
        const text = '---\ntitle: Notas\n---\nCuerpo\n';

        expect(docTextWith(text, {})).toBe(text);
    });
});
