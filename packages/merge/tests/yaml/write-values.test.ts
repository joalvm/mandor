import { describe, expect, it } from 'vitest';
import { parseDocument, type Document } from 'yaml';

import { writeValues } from '../../src/yaml/write-values.js';

function written(text: string, next: unknown): string {
    const document: Document = parseDocument(text);

    writeValues(document, next);

    return document.toString({ lineWidth: 0, indent: 2 });
}

describe('writing a merged value into the document of ours', () => {
    it('touches nothing when the value is the one the document already has', () => {
        const text = '# top\na: 1 # one\nb:\n  - x\n';

        expect(written(text, { a: 1, b: ['x'] })).toBe(text);
    });

    it('changes only the scalar that moved and keeps the comments around it', () => {
        const text = '# top\na: 1 # one\nb: 2 # two\n';

        expect(written(text, { a: 1, b: 3 })).toBe('# top\na: 1 # one\nb: 3 # two\n');
    });

    it('takes a key out and adds a new one at the end', () => {
        expect(written('a: 1\nb: 2\nc: 3\n', { a: 1, c: 3, d: 4 })).toBe('a: 1\nc: 3\nd: 4\n');
    });

    it('goes down into nested objects instead of replacing them', () => {
        const text = 'body:\n  # kind\n  type: json\n  content: a\n';

        expect(written(text, { body: { type: 'json', content: 'b' } })).toBe(
            'body:\n  # kind\n  type: json\n  content: b\n',
        );
    });

    it('replaces a list that changed as a whole', () => {
        expect(written('h:\n  - k: a\n  - k: b\n', { h: [{ k: 'a' }] })).toBe('h:\n  - k: a\n');
    });

    it('writes a text with line breaks as a block, new or old', () => {
        expect(written('a: 1\n', { a: 1, note: 'one\ntwo\n' })).toBe(
            'a: 1\nnote: |\n  one\n  two\n',
        );
    });

    it('replaces the root when it is no object on either side', () => {
        expect(written('', { a: 1 })).toBe('a: 1\n');
        expect(written('- 1\n', [2])).toBe('- 2\n');
    });

    it('turns a scalar into a block when its new text has line breaks, and into null', () => {
        expect(written('a: 1 # one\n', { a: 'x\ny' })).toBe('a: |- # one\n  x\n  y\n');
        expect(written('a: 1\n', { a: null })).toBe('a: null\n');
    });

    it('turns a scalar into an object and back', () => {
        expect(written('a: 1\n', { a: { b: 2 } })).toBe('a:\n  b: 2\n');
        expect(written('a:\n  b: 2\n', { a: 1 })).toBe('a: 1\n');
    });
});
