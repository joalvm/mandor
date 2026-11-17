import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TreeLine } from '../../../src/components/tree/tree-line.js';
import type { TreeFocus } from '../../../src/components/tree/useTreeFocus.js';
import { useTreeReveal } from '../../../src/components/tree/useTreeReveal.js';

function focusOf(): TreeFocus {
    return { claim: vi.fn(), claimed: vi.fn(), id: null, pending: false, take: vi.fn() };
}

const FOLDER: TreeLine = { id: 'docs', level: 1, expanded: false };
const NOTE: TreeLine = { id: 'docs/notes', level: 2 };

describe('a line of the tree asked to show', () => {
    it('waits until the line is among the lines, then goes to it once', () => {
        const focus = focusOf();
        const scrollTo = vi.fn();
        const onRevealed = vi.fn();
        const { rerender } = renderHook(
            (lines: readonly TreeLine[]) => {
                useTreeReveal({ focus, lines, onRevealed, revealed: 'docs/notes', scrollTo });
            },
            { initialProps: [FOLDER] },
        );

        expect(scrollTo).not.toHaveBeenCalled();

        rerender([{ ...FOLDER, expanded: true }, NOTE]);
        rerender([{ ...FOLDER, expanded: true }, NOTE]);

        expect(scrollTo).toHaveBeenCalledExactlyOnceWith(1);
        expect(focus.claim).toHaveBeenCalledWith('docs/notes');
        expect(onRevealed).toHaveBeenCalledTimes(1);
    });

    it('goes nowhere when nothing is asked for', () => {
        const scrollTo = vi.fn();

        renderHook(() => {
            useTreeReveal({
                focus: focusOf(),
                lines: [FOLDER],
                onRevealed: undefined,
                revealed: null,
                scrollTo,
            });
        });

        expect(scrollTo).not.toHaveBeenCalled();
    });
});
