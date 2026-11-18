import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConflictActions } from '../src/components/conflict/ConflictActions.js';
import { ConflictHeader } from '../src/components/conflict/ConflictHeader.js';
import { Wrapper } from './support/conflict-fixtures.js';

describe('the title of a step (ConflictHeader)', () => {
    it('names the entity and the part, and counts the steps', () => {
        render(<ConflictHeader current={2} name="Get users" part="Body" total={3} />, {
            wrapper: Wrapper,
        });

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Get users (Body)');
        expect(screen.getByText('2 of 3')).toBeInTheDocument();
    });

    it('has no count for a single step', () => {
        render(<ConflictHeader current={1} name="Get users" part="URL" total={1} />, {
            wrapper: Wrapper,
        });

        expect(screen.queryByText(/ of /)).toBeNull();
    });
});

describe('the foot of the tab (ConflictActions)', () => {
    it('goes forward with «Next» and back with «Previous» in the middle of the steps', () => {
        const onNext = vi.fn();
        const onPrevious = vi.fn();

        render(
            <ConflictActions
                complete={false}
                index={1}
                onNext={onNext}
                onPrevious={onPrevious}
                stepDone={false}
                total={3}
                unresolved={2}
            />,
            { wrapper: Wrapper },
        );
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        fireEvent.click(screen.getByRole('button', { name: 'Previous' }));

        expect(onNext).toHaveBeenCalledTimes(1);
        expect(onPrevious).toHaveBeenCalledTimes(1);
        expect(screen.getByText('2 unresolved')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Resolve' })).toBeNull();
    });

    it('turns «Next» into «Resolve» on the last step, which waits for every answer', () => {
        const onResolve = vi.fn();
        const props = {
            index: 0,
            onNext: vi.fn(),
            onPrevious: vi.fn(),
            onResolve,
            stepDone: true,
            total: 1,
        };
        const { rerender } = render(
            <ConflictActions {...props} complete={false} unresolved={1} />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('button', { name: 'Resolve' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Previous' })).toBeNull();

        rerender(<ConflictActions {...props} complete unresolved={0} />);
        fireEvent.click(screen.getByRole('button', { name: 'Resolve' }));

        expect(onResolve).toHaveBeenCalledTimes(1);
        expect(screen.getByText('All resolved')).toBeInTheDocument();
    });
});
