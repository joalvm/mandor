import { editor } from 'monaco-editor/editor/editor.api.js';
import { describe, expect, it, vi } from 'vitest';

import '../../../src/editor/monaco/monaco-setup.js';
import { MARKDOWN_MONARCH } from '../../../src/editor/monaco/markdown-monarch.js';

/** The kind of each token of one line, in order, with the empty runs left out. */
function kinds(line: string): string[] {
    return (editor.tokenize(line, 'markdown')[0] ?? [])
        .map((token) => token.type)
        .filter((type) => type !== '');
}

describe('the grammar of markdown', () => {
    it('names its tokens the way the GitHub theme reads them', () => {
        expect(MARKDOWN_MONARCH.tokenPostfix).toBe('.md');
        expect(kinds('## Title')).toEqual(['markup.heading.md']);
        expect(kinds('> quoted')).toEqual(['markup.quote.md']);
        expect(kinds('---')).toEqual(['meta.separator.md']);
    });

    /** A heading, a bullet and a row of a table are three things, and the colours tell them apart. */
    it('tells the bullet of a list and the box of a task from the text after them', () => {
        expect(kinds('- item')[0]).toBe('markup.list.md');
        expect(kinds('- [ ] task').slice(0, 2)).toEqual(['markup.list.md', 'markup.list.md']);
    });

    it('marks what the text of a line says inline', () => {
        expect(kinds('`code`')).toEqual(['markup.inline.raw.md']);
        expect(kinds('**strong**')).toEqual(['markup.bold.md']);
        expect(kinds('*leaning*')).toEqual(['markup.italic.md']);
        expect(kinds('~~gone~~')).toEqual(['markup.strikethrough.md']);
        expect(kinds('\\*')).toEqual(['constant.character.escape.md']);
        expect(kinds('<!-- note -->')).toEqual(['comment.md']);
    });

    it('splits a link into the words that are read and the address that is followed', () => {
        expect(kinds('[docs](https://a.b)')).toEqual([
            'string.other.link.md',
            'markup.underline.link.md',
        ]);
        expect(kinds('[docs]: https://a.b')).toEqual([
            'constant.other.reference.link.md',
            'markup.underline.link.md',
        ]);
    });

    /** A fence that names no language is read as it is, and stays the doc's own colour. */
    it('keeps a fence that names no language as raw text', async () => {
        const fence = ['```', 'raw line', '```'].join('\n');

        await vi.waitFor(() => {
            expect(editor.tokenize(fence, 'markdown')[1]?.[0]?.type).toBe('markup.raw.md');
        });
    });
});
