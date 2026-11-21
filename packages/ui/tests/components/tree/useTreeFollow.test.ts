import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TreeLine } from '../../../src/components/tree/tree-line.js';
import { useTreeFollow } from '../../../src/components/tree/useTreeFollow.js';

const FOLDER: TreeLine = { id: 'docs', level: 1, expanded: false };
const NOTE: TreeLine = { id: 'docs/notes', level: 2 };
const OTHER: TreeLine = { id: 'other', level: 1, expanded: true };
const INSIDE: TreeLine = { id: 'other/inside', level: 2 };

type Props = { followed: string | null; lines: readonly TreeLine[] };

function follow(initialProps: Props, scrollTo: (index: number) => void) {
    return renderHook(
        ({ followed, lines }: Props) => {
            useTreeFollow({ followed, lines, scrollTo });
        },
        { initialProps },
    );
}

describe('the line a tree follows', () => {
    it('waits until the line is among the lines, then brings it into sight once', () => {
        const scrollTo = vi.fn();
        const { rerender } = follow({ followed: 'docs/notes', lines: [FOLDER] }, scrollTo);

        expect(scrollTo).not.toHaveBeenCalled();

        rerender({ followed: 'docs/notes', lines: [{ ...FOLDER, expanded: true }, NOTE] });
        rerender({ followed: 'docs/notes', lines: [{ ...FOLDER, expanded: true }, NOTE] });

        expect(scrollTo).toHaveBeenCalledExactlyOnceWith(1);
    });

    /** Opening a folder above the line moves it down; the reader scrolled away on purpose. */
    it('leaves the scroll alone while the lines above the one it follows open and close', () => {
        const scrollTo = vi.fn();
        const { rerender } = follow(
            { followed: 'docs/notes', lines: [{ ...FOLDER, expanded: true }, NOTE] },
            scrollTo,
        );

        rerender({
            followed: 'docs/notes',
            lines: [OTHER, INSIDE, { ...FOLDER, expanded: true }, NOTE],
        });

        expect(scrollTo).toHaveBeenCalledExactlyOnceWith(1);
    });

    it('goes back to a line it follows again after following none', () => {
        const scrollTo = vi.fn();
        const lines = [{ ...FOLDER, expanded: true }, NOTE];
        const { rerender } = follow({ followed: 'docs/notes', lines }, scrollTo);

        rerender({ followed: null, lines });
        rerender({ followed: 'docs/notes', lines });

        expect(scrollTo).toHaveBeenCalledTimes(2);
        expect(scrollTo).toHaveBeenLastCalledWith(1);
    });

    it('goes nowhere while it follows nothing', () => {
        const scrollTo = vi.fn();

        follow({ followed: null, lines: [FOLDER] }, scrollTo);

        expect(scrollTo).not.toHaveBeenCalled();
    });
});
