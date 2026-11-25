import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CornerCount } from '../../../src/index.js';
import { allByPart, byPart } from '../../../src/testing/by-part.js';

afterEach(() => {
    cleanup();
});

function draw(count: number) {
    return render(
        <CornerCount count={count} tone="error">
            <i>control</i>
        </CornerCount>,
    );
}

describe('the count on the corner of a control (CornerCount)', () => {
    it('draws only the control while nothing waits on it', () => {
        draw(0);

        expect(screen.getByText('control')).toBeInTheDocument();
        expect(allByPart('corner-count-mark')).toEqual([]);
    });

    /** The control says the count in its own name; the mark is drawn over it and only seen. */
    it('marks the control with how many wait on it, seen and not heard', () => {
        draw(3);

        const mark = byPart('corner-count-mark');

        expect(mark.textContent).toBe('3');
        expect(mark).toHaveAttribute('aria-hidden', 'true');
        expect(mark).toHaveAttribute('data-tone', 'error');
        expect(byPart('corner-count')).toContainElement(mark);
        expect(
            screen.getByText('control').compareDocumentPosition(mark) &
                Node.DOCUMENT_POSITION_FOLLOWING,
        ).toBeTruthy();
    });

    it.each([
        [9, '9'],
        [10, '9+'],
        [250, '9+'],
    ])('reads %i as %s: one digit at most, and a plus past nine', (count, shown) => {
        draw(count);

        expect(byPart('corner-count-mark').textContent).toBe(shown);
    });
});
