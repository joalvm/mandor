import { cleanup, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useRevealedRow } from '../../../src/components/row/useRevealedRow.js';

function Row({ onRevealed, revealed }: { onRevealed: () => void; revealed: boolean }) {
    const row = useRef<HTMLDivElement>(null);

    useRevealedRow(row, revealed, onRevealed);

    return <div data-testid="row" ref={row} tabIndex={-1} />;
}

afterEach(cleanup);

describe('a row asked to show', () => {
    it('comes into view and takes the focus once it is asked, and says so', () => {
        const onRevealed = vi.fn();
        const scrolled = vi.spyOn(HTMLDivElement.prototype, 'scrollIntoView');
        const view = render(<Row onRevealed={onRevealed} revealed={false} />);

        expect(onRevealed).not.toHaveBeenCalled();

        view.rerender(<Row onRevealed={onRevealed} revealed />);

        expect(screen.getByTestId('row')).toHaveFocus();
        expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' });
        expect(onRevealed).toHaveBeenCalledTimes(1);

        scrolled.mockRestore();
    });
});
