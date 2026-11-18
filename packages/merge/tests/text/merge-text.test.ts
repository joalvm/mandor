import { describe, expect, it } from 'vitest';

import { mergeText } from '../../src/text/merge-text.js';
import { mergeValues } from '../../src/value/merge-values.js';

describe('merging free text by lines', () => {
    it('joins edits that are far apart', () => {
        const base = 'one\ntwo\nthree\nfour\nfive';
        const result = mergeText(
            base,
            'ONE\ntwo\nthree\nfour\nfive',
            base.replace('five', 'FIVE'),
            [],
        );

        expect(result).toEqual({ value: 'ONE\ntwo\nthree\nfour\nFIVE', conflicts: [] });
    });

    it('does not ask when both sides made the same edit', () => {
        const result = mergeText('a\nb', 'a\nB', 'a\nB', ['doc']);

        expect(result).toEqual({ value: 'a\nB', conflicts: [] });
    });

    it('asks once, with the three whole texts, when both edited the same line', () => {
        const result = mergeText('a\nb\nc', 'a\nmine\nc', 'a\ntheirs\nc', ['body', 'content']);

        expect(result.value).toBe('a\nmine\nc');
        expect(result.conflicts).toEqual([
            {
                id: 'body/content',
                path: ['body', 'content'],
                shape: 'text',
                base: { value: 'a\nb\nc' },
                ours: { value: 'a\nmine\nc' },
                theirs: { value: 'a\ntheirs\nc' },
                proposed: 'a\nmine\nc',
            },
        ]);
    });

    it('keeps what merged cleanly around the lines that clash', () => {
        const base = 'top\nx\nx2\nmid\ny\ny2\nbottom';
        const result = mergeText(
            base,
            base.replace('top', 'TOP').replace('mid', 'mine'),
            base.replace('mid', 'theirs').replace('bottom', 'BOTTOM'),
            [],
        );

        expect(result.value).toBe('TOP\nx\nx2\nmine\ny\ny2\nBOTTOM');
        expect(result.conflicts[0]?.proposed).toBe('TOP\nx\nx2\nmine\ny\ny2\nBOTTOM');
    });

    it('takes empty text as no lines at all', () => {
        expect(mergeText('', '', '', [])).toEqual({ value: '', conflicts: [] });
        expect(mergeText('', 'a', '', [])).toEqual({ value: 'a', conflicts: [] });
        expect(mergeText('', 'a', 'b', []).conflicts).toHaveLength(1);
    });

    /**
     * The match of lines grows faster than the pairs of equal lines it walks: a long JSON body,
     * all `{`, `},` and the same keys, held the process for minutes. Past the budget the text is
     * one question, ours proposed, even where the lines would have joined.
     */
    it('asks about the whole text when its lines repeat past what a merge can afford', () => {
        const base = Array.from({ length: 1_000 }, () => 'x').join('\n');
        const result = mergeText(base, `top\n${base}`, `${base}\nend`, ['body']);

        expect(result.value).toBe(`top\n${base}`);
        expect(result.conflicts).toEqual([
            expect.objectContaining({ shape: 'text', path: ['body'], proposed: `top\n${base}` }),
        ]);
    });

    /** Twice the repeated-line fixture's length catches a guard based on size rather than equal pairs. */
    it('still joins a long text whose lines do not repeat', () => {
        const base = Array.from({ length: 2_000 }, (_, index) => `line ${String(index)}`).join(
            '\n',
        );
        const result = mergeText(base, `top\n${base}`, `${base}\nend`, []);

        expect(result).toEqual({ value: `top\n${base}\nend`, conflicts: [] });
    });

    it('keeps the end of the text as each side left it', () => {
        expect(mergeText('a\nb\nc', 'a\nb\nC', 'A\nb\nc', []).value).toBe('A\nb\nC');
        expect(mergeText('a\nb', 'a\nb\n', 'A\nb', []).value).toBe('A\nb\n');
        expect(mergeText('a\nb\n', 'a\nb\n', 'a\nb\nc\n', []).value).toBe('a\nb\nc\n');
    });
});

describe('where the merge of values hands a string to the merge of text', () => {
    it('does so when a string has a line break on any side', () => {
        const merged = mergeValues(
            { content: 'a\nb\nc' },
            { content: 'A\nb\nc' },
            { content: 'a\nb\nC' },
        );
        const lonely = mergeValues({ note: 'a\nb' }, { note: 'x' }, { note: 'y' });

        expect(merged).toEqual({ value: { content: 'A\nb\nC' }, conflicts: [] });
        expect(lonely.conflicts[0]).toMatchObject({ id: 'note', shape: 'text' });
    });

    it('keeps a one-line string a plain value to choose', () => {
        const result = mergeValues({ name: 'a' }, { name: 'b' }, { name: 'c' });

        expect(result.conflicts[0]).toMatchObject({ shape: 'value' });
    });

    it('treats a base that is no string as empty text', () => {
        const result = mergeValues({ text: 1 }, { text: 'a\nb' }, { text: 'a\nb\nc' });

        expect(result.conflicts[0]).toMatchObject({ shape: 'text', base: { value: '' } });
    });

    it('asks about a value when only one side is text', () => {
        const result = mergeValues({ text: 'a\nb' }, { text: 'a\nc' }, { text: 7 });

        expect(result.conflicts[0]).toMatchObject({ shape: 'value' });
    });
});
