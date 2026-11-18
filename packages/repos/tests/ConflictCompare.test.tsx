import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConflictCompare } from '../src/components/conflict/ConflictCompare.js';
import { ACCEPT, TRACE, Wrapper } from './support/conflict-fixtures.js';

function draw(choices = {}) {
    const onChoose = vi.fn();
    const onClear = vi.fn();

    render(
        <ConflictCompare
            choices={choices}
            items={[ACCEPT, TRACE]}
            label="Headers"
            onChoose={onChoose}
            onClear={onClear}
        />,
        { wrapper: Wrapper },
    );

    return { onChoose, onClear };
}

describe('two copies and a result in one table (ConflictCompare)', () => {
    it('has the two copies side by side and the result across both columns', () => {
        draw();

        expect(screen.getByRole('table', { name: 'Headers' })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /Mine/ })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /Incoming/ })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: 'Result' })).toHaveAttribute(
            'colspan',
            '2',
        );
    });

    it('takes every line of a side with the box of its head', () => {
        const { onChoose } = draw();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Select all of mine' }));

        expect(onChoose).toHaveBeenCalledWith(ACCEPT.id, { pick: 'ours' });
        expect(onChoose).toHaveBeenCalledWith(TRACE.id, { pick: 'ours' });
    });

    it('gives back only the lines of that side when its head box is cleared', () => {
        const { onChoose, onClear } = draw({
            [ACCEPT.id]: { pick: 'theirs' },
            [TRACE.id]: { pick: 'theirs' },
        });

        fireEvent.click(screen.getByRole('checkbox', { name: 'Select all of mine' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Select all incoming' }));

        expect(onChoose).toHaveBeenCalledTimes(2);
        expect(onClear).toHaveBeenCalledTimes(2);
        expect(onClear).toHaveBeenCalledWith(ACCEPT.id);
    });
});
