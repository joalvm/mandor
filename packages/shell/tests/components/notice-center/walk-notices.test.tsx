import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { walkNotices } from '../../../src/components/notice-center/walk-notices.js';

function draw(onDismiss = vi.fn()) {
    render(
        <ul>
            {['first', 'second', 'third'].map((name) => (
                <li
                    data-testid={name}
                    key={name}
                    onKeyDown={(event) => {
                        walkNotices(event, onDismiss);
                    }}
                    tabIndex={0}
                >
                    <button type="button">{`dismiss ${name}`}</button>
                </li>
            ))}
        </ul>,
    );

    return onDismiss;
}

afterEach(cleanup);

describe('walking the rows of the notice centre', () => {
    it('moves down and up the rows with the arrows', () => {
        draw();

        fireEvent.keyDown(screen.getByTestId('first'), { key: 'ArrowDown' });

        expect(screen.getByTestId('second')).toHaveFocus();

        fireEvent.keyDown(screen.getByTestId('second'), { key: 'ArrowUp' });

        expect(screen.getByTestId('first')).toHaveFocus();
    });

    it('lets a row go with Delete and hands the focus on, to the one before at the end', () => {
        const onDismiss = draw();

        fireEvent.keyDown(screen.getByTestId('third'), { key: 'Delete' });

        expect(onDismiss).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('second')).toHaveFocus();
    });

    it('leaves the keys of what the row holds, and any other key, alone', () => {
        const onDismiss = draw();

        fireEvent.keyDown(screen.getByRole('button', { name: 'dismiss first' }), { key: 'Delete' });
        fireEvent.keyDown(screen.getByTestId('first'), { key: 'Enter' });

        expect(onDismiss).not.toHaveBeenCalled();
        expect(document.body).toHaveFocus();
    });
});
