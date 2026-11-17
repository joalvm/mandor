import { MARKDOWN_PREVIEW_EVENT } from '@mandor/ui';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { usePreviewChord } from '../src/hooks/usePreviewChord.js';

/** What the editor sends up when `Ctrl+K V` is pressed in it, from one of its lines. */
function chordFrom(box: HTMLElement): void {
    const line = document.createElement('span');

    box.append(line);
    act(() => {
        line.dispatchEvent(new CustomEvent(MARKDOWN_PREVIEW_EVENT, { bubbles: true }));
    });
}

describe('the chord that opens the preview', () => {
    it('is heard by whoever holds the box the editor is in', () => {
        const box = { current: document.createElement('div') };
        const onChord = vi.fn();

        renderHook(() => {
            usePreviewChord(box, onChord);
        });
        chordFrom(box.current);

        expect(onChord).toHaveBeenCalledOnce();
    });

    /** The answer depends on whether the preview is open now, not when the box was first heard. */
    it('answers with what the holder says to do now', () => {
        const box = { current: document.createElement('div') };
        const first = vi.fn();
        const now = vi.fn();
        const { rerender } = renderHook(
            ({ onChord }) => {
                usePreviewChord(box, onChord);
            },
            { initialProps: { onChord: first } },
        );

        rerender({ onChord: now });
        chordFrom(box.current);

        expect(first).not.toHaveBeenCalled();
        expect(now).toHaveBeenCalledOnce();
    });

    it('is no longer heard once the box is gone', () => {
        const box = { current: document.createElement('div') };
        const onChord = vi.fn();
        const { unmount } = renderHook(() => {
            usePreviewChord(box, onChord);
        });

        unmount();
        chordFrom(box.current);

        expect(onChord).not.toHaveBeenCalled();
    });

    it('listens to nothing while there is no box', () => {
        const onChord = vi.fn();

        renderHook(() => {
            usePreviewChord({ current: null }, onChord);
        });
        chordFrom(document.body);

        expect(onChord).not.toHaveBeenCalled();
    });
});
