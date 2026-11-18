import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ConflictStep } from '../src/components/conflict/ConflictStep.js';
import { LineList } from '../src/components/conflict/LineList.js';
import { ResultList } from '../src/components/conflict/ResultList.js';
import { ACCEPT, BODY, TRACE, Wrapper } from './support/conflict-fixtures.js';

describe('one part of a conflict (ConflictStep)', () => {
    it('puts lines in the table and keeps a text in the editor of differences', () => {
        render(
            <ConflictStep
                choices={{}}
                items={[ACCEPT, TRACE, BODY]}
                onChoose={vi.fn()}
                onClear={vi.fn()}
                title="Headers"
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByRole('table', { name: 'Headers' })).toBeInTheDocument();
        expect(screen.getByRole('group', { name: 'content' })).toBeInTheDocument();
    });

    it('draws no table when every question is a text', () => {
        render(
            <ConflictStep
                choices={{}}
                items={[BODY]}
                onChoose={vi.fn()}
                onClear={vi.fn()}
                title="Body"
            />,
            { wrapper: Wrapper },
        );

        expect(screen.queryByRole('table')).toBeNull();
    });
});

describe('the lines of one side (LineList)', () => {
    it('has one line per question and tells which one was ticked', () => {
        const onToggle = vi.fn();

        render(
            <LineList
                choices={{ [ACCEPT.id]: { pick: 'theirs' } }}
                items={[ACCEPT, TRACE]}
                onToggle={onToggle}
                side="theirs"
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(screen.getByRole('checkbox', { name: 'Use incoming for Accept' })).toBeChecked();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Use incoming for X-Trace' }));

        expect(onToggle).toHaveBeenCalledWith(TRACE, true);
    });
});

describe('what the answers write (ResultList)', () => {
    it('shows only the ticked lines, a removal struck through', () => {
        render(
            <ResultList
                choices={{ [ACCEPT.id]: { pick: 'ours' }, [TRACE.id]: { pick: 'theirs' } }}
                items={[ACCEPT, TRACE]}
            />,
            { wrapper: Wrapper },
        );

        const lines = screen.getAllByRole('listitem');

        expect(lines).toHaveLength(2);
        expect(lines.map((line) => line.textContent)).toEqual(['Accept: text/html', 'X-Trace']);
        expect(screen.getByText('X-Trace')).toHaveClass('line-through');
    });

    it('says how to start when nothing is ticked', () => {
        render(<ResultList choices={{}} items={[ACCEPT]} />, { wrapper: Wrapper });

        expect(screen.getByText('Tick the lines you want to keep.')).toBeInTheDocument();
    });
});
