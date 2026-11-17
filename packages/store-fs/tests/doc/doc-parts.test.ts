import { describe, expect, it } from 'vitest';

import { docParts, titleOfDoc } from '../../src/doc/doc-parts.js';

describe('splitting a doc into its front matter and its body', () => {
    it('takes the whole text as the body when there is no front matter', () => {
        expect(docParts('# Notas\n')).toEqual({ front: '', title: '', body: '# Notas\n' });
    });

    it('reads the title of the front matter and leaves the body after it', () => {
        expect(docParts('---\ntitle: Notas\n---\n# Hola\n')).toEqual({
            front: '---\ntitle: Notas\n---\n',
            title: 'Notas',
            body: '# Hola\n',
        });
    });

    it('accepts an empty front matter and gives it no title', () => {
        expect(docParts('---\n---\nCuerpo\n')).toEqual({
            front: '---\n---\n',
            title: '',
            body: 'Cuerpo\n',
        });
    });

    it('keeps the other keys of the front matter inside it', () => {
        const parts = docParts('---\nauthor: Ana\ntitle: Notas\n---\nCuerpo\n');

        expect(parts.title).toBe('Notas');
        expect(parts.front).toBe('---\nauthor: Ana\ntitle: Notas\n---\n');
    });

    it('gives no title when the front matter has none or it is not text', () => {
        expect(docParts('---\nauthor: Ana\n---\nCuerpo\n').title).toBe('');
        expect(docParts('---\ntitle: 3\n---\nCuerpo\n').title).toBe('');
    });

    it('takes the whole text as the body when the block does not parse', () => {
        const text = '---\ntitle: [roto\n---\nCuerpo\n';

        expect(docParts(text)).toEqual({ front: '', title: '', body: text });
    });

    it('takes the whole text as the body when the block is not a map', () => {
        const text = '---\n- uno\n- dos\n---\nCuerpo\n';

        expect(docParts(text)).toEqual({ front: '', title: '', body: text });
    });

    it('reads a front matter written with Windows line ends', () => {
        const parts = docParts('---\r\ntitle: Notas\r\n---\r\nCuerpo\r\n');

        expect(parts.title).toBe('Notas');
        expect(parts.body).toBe('Cuerpo\r\n');
    });

    it('leaves an empty body when the text is only the block', () => {
        expect(docParts('---\ntitle: Notas\n---')).toEqual({
            front: '---\ntitle: Notas\n---',
            title: 'Notas',
            body: '',
        });
    });

    it('does not take a rule in the middle of the text for front matter', () => {
        const text = 'Intro\n---\ntitle: Notas\n---\n';

        expect(docParts(text)).toEqual({ front: '', title: '', body: text });
    });
});

describe('the title a doc is known by', () => {
    it('is the one in the front matter', () => {
        expect(titleOfDoc('---\ntitle: Notas\n---\n', 'k3m9x2q7a4bd.md')).toBe('Notas');
    });

    it('falls back to the file name without its extension when the text names none', () => {
        expect(titleOfDoc('# Hola\n', 'readme.md')).toBe('readme');
    });
});
