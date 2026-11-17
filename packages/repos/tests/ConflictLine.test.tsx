import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CodeText } from '../src/components/conflict/CodeText.js';
import { ConflictLine } from '../src/components/conflict/ConflictLine.js';
import { Wrapper } from './support/conflict-fixtures.js';

describe('one line of a side (ConflictLine)', () => {
    it('draws a header in colour and answers its box', () => {
        const onCheckedChange = vi.fn();

        render(
            <ConflictLine
                checked={false}
                label="Use mine for Accept"
                name="Accept"
                onCheckedChange={onCheckedChange}
                side={{ value: { key: 'Accept', value: 'text/html' } }}
                tone="ours"
            />,
            { wrapper: Wrapper },
        );
        fireEvent.click(screen.getByRole('checkbox', { name: 'Use mine for Accept' }));

        expect(onCheckedChange).toHaveBeenCalledWith(true);
        expect(screen.getByText('Accept')).toHaveClass('text-text-info');
        expect(screen.getByText('text/html')).toHaveClass('text-text-success');
        expect(screen.getByRole('listitem')).toHaveAttribute('data-checked', 'false');
    });

    it('has no box when nothing can change it, and strikes a side that is not there', () => {
        render(<ConflictLine name="X-Trace" side={null} tone="theirs" />, { wrapper: Wrapper });

        expect(screen.queryByRole('checkbox')).toBeNull();
        expect(screen.getByText('X-Trace')).toHaveClass('line-through');
        expect(screen.getByRole('listitem')).toHaveAttribute('data-tone', 'theirs');
    });
});

describe('the words of a side (CodeText)', () => {
    it('lays a structure out in a block of its own', () => {
        render(<CodeText block text={'{\n  "a": 1\n}'} />);

        expect(screen.getByText('1').closest('pre')).toHaveAttribute('data-part', 'code-text');
        expect(screen.getByText('1')).toHaveClass('text-text-warning');
    });
});
