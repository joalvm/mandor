import type { CodeEditorHandle } from '@mandor/ui';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useDocScrollSync } from '../src/hooks/useDocScrollSync.js';

/** A page of two blocks a hundred pixels apart, laid out by hand: jsdom lays nothing out. */
function pageOfTwoBlocks(): HTMLDivElement {
    const page = document.createElement('div');

    page.getBoundingClientRect = () => new DOMRect(0, 0, 800, 400);

    [1, 11].forEach((line, index) => {
        const block = document.createElement('p');

        block.setAttribute('data-line', String(line));
        block.getBoundingClientRect = () => new DOMRect(0, index * 100 - page.scrollTop, 800, 20);
        page.append(block);
    });

    return page;
}

function sync(editor: CodeEditorHandle) {
    const page = pageOfTwoBlocks();
    const { result } = renderHook(() =>
        useDocScrollSync({ editorRef: { current: editor }, pageRef: { current: page } }),
    );

    return { page, sides: result.current };
}

function editorAtLine(line: number): CodeEditorHandle {
    return {
        run: () => Promise.resolve(true),
        selectPointer: vi.fn(),
        showLine: vi.fn(),
        topLine: () => line,
        view: vi.fn(),
    };
}

describe('keeping the markdown and the page on the same part of the doc', () => {
    /** Two halves that both push each other never settle, so only one of them leads. */
    it('moves neither half while the pointer is over neither', () => {
        const editor = editorAtLine(6);
        const { page, sides } = sync(editor);

        sides.code.onScroll();
        sides.page.onScroll();

        expect(page.scrollTop).toBe(0);
        expect(editor.showLine).not.toHaveBeenCalled();
    });

    it('takes the page to the line the editor opens on', () => {
        const { page, sides } = sync(editorAtLine(6));

        sides.code.onPointerEnter();
        sides.code.onScroll();

        expect(page.scrollTop).toBe(50);
    });

    it('takes the editor to the line the page opens on', () => {
        const editor = editorAtLine(1);
        const { page, sides } = sync(editor);

        sides.page.onPointerEnter();
        page.scrollTop = 100;
        sides.page.onScroll();

        expect(editor.showLine).toHaveBeenCalledWith(11);
    });

    /** The half being answered must not answer back: its own move is not a move of its own. */
    it('ignores the half that is only following the other', () => {
        const editor = editorAtLine(6);
        const { page, sides } = sync(editor);

        sides.page.onPointerEnter();
        sides.code.onScroll();

        expect(page.scrollTop).toBe(0);
    });
});
