import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SPLIT_AXES } from '../../../src/components/split/split-axis.js';
import { SplitHandle } from '../../../src/components/split/SplitHandle.js';
import { SplitHalf } from '../../../src/components/split/SplitHalf.js';
import { SplitPane } from '../../../src/components/split/SplitPane.js';

/** jsdom captures no pointers, so the handle is taught the two calls it makes. */
function teachPointerCapture(handle: HTMLElement): void {
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();
}

function handleOf(onValueChange: (value: number) => void, value = 40): HTMLElement {
    cleanup();

    render(
        <div>
            <SplitHandle
                axis={SPLIT_AXES.row}
                label="Redimensionar paneles"
                max={70}
                min={30}
                onValueChange={onValueChange}
                position="40%"
                value={value}
            />
        </div>,
    );

    return screen.getByRole('separator', { name: 'Redimensionar paneles' });
}

describe('the divider of a split', () => {
    it('exposes itself as the separator it is, with the numbers the caller keeps', () => {
        const handle = handleOf(vi.fn(), 40.4);

        expect(handle).toHaveAttribute('data-part', 'split-handle');
        expect(handle).toHaveAttribute('aria-orientation', 'vertical');
        expect(handle).toHaveAttribute('aria-valuemin', '30');
        expect(handle).toHaveAttribute('aria-valuemax', '70');
        expect(handle).toHaveAttribute('aria-valuenow', '40');
        expect(handle).toHaveAttribute('data-position', '40%');
        expect(handle).toHaveAttribute('tabindex', '0');
    });

    /** Nothing is laid out in jsdom, so the share a keypress moves is the one-step fallback. */
    it('moves one step towards the arrow that was pressed', () => {
        const onValueChange = vi.fn();
        const handle = handleOf(onValueChange);

        fireEvent.keyDown(handle, { code: 'ArrowRight', key: 'ArrowRight' });

        expect(onValueChange).toHaveBeenLastCalledWith(41);
    });

    it('moves back the same step, and takes no other key', () => {
        const onValueChange = vi.fn();
        const handle = handleOf(onValueChange);

        fireEvent.keyDown(handle, { code: 'ArrowLeft', key: 'ArrowLeft' });
        expect(onValueChange).toHaveBeenLastCalledWith(39);

        fireEvent.keyDown(handle, { code: 'KeyA', key: 'a' });
        expect(onValueChange).toHaveBeenCalledOnce();
    });

    it('stops at the edges the caller set instead of crossing them', () => {
        const onValueChange = vi.fn();
        const atTheMax = handleOf(onValueChange, 70);

        fireEvent.keyDown(atTheMax, { code: 'ArrowRight', key: 'ArrowRight' });
        expect(onValueChange).toHaveBeenLastCalledWith(70);

        const atTheMin = handleOf(onValueChange, 30);

        fireEvent.keyDown(atTheMin, { code: 'ArrowLeft', key: 'ArrowLeft' });
        expect(onValueChange).toHaveBeenLastCalledWith(30);
    });

    it('gives back on a double click the place its surface starts at, when it has its own', () => {
        const onValueChange = vi.fn();

        render(
            <SplitPane initial={65} label="Reparto" onValueChange={onValueChange} value={40}>
                <SplitHalf>uno</SplitHalf>
                <SplitHalf>otro</SplitHalf>
            </SplitPane>,
        );
        fireEvent.dblClick(screen.getByRole('separator', { name: 'Reparto' }));

        expect(onValueChange).toHaveBeenCalledWith(65);
    });

    it('gives the middle back on a double click', () => {
        const onValueChange = vi.fn();
        const handle = handleOf(onValueChange);

        fireEvent.dblClick(handle);

        expect(onValueChange).toHaveBeenCalledWith(50);
    });

    /**
     * jsdom lays nothing out, so the pane under the handle is taught a size: two hundred pixels
     * wide, which makes half of it land on the middle of the share.
     */
    it('follows the pointer across the pane, clamped to the edges', () => {
        const onValueChange = vi.fn();
        const handle = handleOf(onValueChange);

        teachPointerCapture(handle);

        const pane = handle.parentElement;

        if (pane === null) {
            throw new Error('the handle never hung from a pane');
        }

        pane.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;

        fireEvent.pointerDown(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientX: 100 });
        expect(onValueChange).toHaveBeenLastCalledWith(50);

        fireEvent.pointerMove(handle, { clientX: 250 });
        expect(onValueChange).toHaveBeenLastCalledWith(70);

        fireEvent.pointerUp(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientX: 200 });

        expect(onValueChange).toHaveBeenCalledTimes(2);
        expect(onValueChange).toHaveBeenLastCalledWith(70);
    });

    it('ignores the pointer while nobody is holding the line down', () => {
        const onValueChange = vi.fn();
        const handle = handleOf(onValueChange);

        const pane = handle.parentElement;

        if (pane === null) {
            throw new Error('the handle never hung from a pane');
        }

        pane.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;

        fireEvent.pointerMove(handle, { clientX: 100 });

        expect(onValueChange).not.toHaveBeenCalled();
    });

    /**
     * The system can take the pointer away in the middle of a drag — a touch interrupted, a
     * window that lost it — and the line must stop where it was: a handle that keeps dragging
     * without a hand on it moves the pane while the user works beside it.
     */
    it('lets the line go when the capture of the pointer is lost mid drag', () => {
        const onValueChange = vi.fn();
        const handle = handleOf(onValueChange);

        teachPointerCapture(handle);

        const pane = handle.parentElement;

        if (pane === null) {
            throw new Error('the handle never hung from a pane');
        }

        pane.getBoundingClientRect = () => ({ left: 0, width: 200 }) as DOMRect;

        fireEvent.pointerDown(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientX: 100 });

        expect(onValueChange).toHaveBeenLastCalledWith(50);

        fireEvent.lostPointerCapture(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientX: 150 });

        expect(onValueChange).toHaveBeenCalledTimes(1);
    });

    it('waits for a pane that has been laid out before it measures', () => {
        const onValueChange = vi.fn();
        const handle = handleOf(onValueChange);

        teachPointerCapture(handle);

        fireEvent.pointerDown(handle, { pointerId: 1 });
        fireEvent.pointerMove(handle, { clientX: 100 });

        expect(onValueChange).not.toHaveBeenCalled();
    });
});
