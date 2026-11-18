import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePointerDrag } from '../../src/hooks/usePointerDrag.js';

type Heard = (event: unknown, box: HTMLElement) => void;

function Line({ onDrag }: { onDrag: Heard }) {
    const drag = usePointerDrag(onDrag);

    return (
        <div data-part="box">
            <div {...drag} data-part="line" role="separator" tabIndex={0} />
        </div>
    );
}

/** jsdom captures no pointers, so the line is taught the two calls it makes. */
function drawn(onDrag: Heard) {
    const capture = vi.fn();
    const release = vi.fn();

    render(<Line onDrag={onDrag} />);

    const line = screen.getByRole('separator');

    line.setPointerCapture = capture;
    line.releasePointerCapture = release;

    return { capture, line, release };
}

afterEach(cleanup);

describe('the drag of a line between two zones', () => {
    it('hears nothing until the pointer is pressed on the line', () => {
        const onDrag = vi.fn();
        const { line } = drawn(onDrag);

        fireEvent.pointerMove(line, { clientX: 10 });

        expect(onDrag).not.toHaveBeenCalled();
    });

    it('captures the pointer on press and hears each move with the box of the line', () => {
        const onDrag = vi.fn();
        const { capture, line } = drawn(onDrag);

        fireEvent.pointerDown(line, { pointerId: 1 });
        fireEvent.pointerMove(line, { clientX: 10 });

        expect(capture).toHaveBeenCalledWith(1);
        expect(onDrag).toHaveBeenCalledTimes(1);
        expect(onDrag.mock.calls[0]?.[1]).toBe(line.parentElement);
    });

    it('lets the pointer go on release and stops hearing', () => {
        const onDrag = vi.fn();
        const { line, release } = drawn(onDrag);

        fireEvent.pointerDown(line, { pointerId: 1 });
        fireEvent.pointerUp(line, { pointerId: 1 });
        fireEvent.pointerMove(line, { clientX: 10 });

        expect(release).toHaveBeenCalledWith(1);
        expect(onDrag).not.toHaveBeenCalled();
    });

    it('stops where the line was when the system takes the pointer away', () => {
        const onDrag = vi.fn();
        const { line } = drawn(onDrag);

        fireEvent.pointerDown(line, { pointerId: 1 });
        fireEvent.lostPointerCapture(line);
        fireEvent.pointerMove(line, { clientX: 10 });

        expect(onDrag).not.toHaveBeenCalled();
    });
});
