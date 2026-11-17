import type { ConflictItem } from '@mandor/ipc';
import { describe, expect, it } from 'vitest';

import { answerText } from '../../src/lib/answer-text.js';

function textClash(proposed?: string): ConflictItem {
    return {
        base: { value: 'base\n' },
        id: 'body/content',
        ours: { value: 'ours\n' },
        path: ['body', 'content'],
        proposed,
        shape: 'text',
        theirs: { value: 'theirs\n' },
    };
}

describe('the text an answer to a clash of texts writes', () => {
    it('is the merge by lines before any answer, or our side when there is none', () => {
        expect(answerText(textClash('merged\n'), undefined)).toBe('merged\n');
        expect(answerText(textClash(), undefined)).toBe('ours\n');
    });

    it('is the text typed, or the whole of the side taken', () => {
        expect(answerText(textClash('merged\n'), { text: 'typed\n' })).toBe('typed\n');
        expect(answerText(textClash('merged\n'), { pick: 'theirs' })).toBe('theirs\n');
        expect(answerText(textClash('merged\n'), { pick: 'ours' })).toBe('ours\n');
    });
});
