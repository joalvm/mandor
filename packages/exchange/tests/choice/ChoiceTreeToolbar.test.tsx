import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ChoiceTreeToolbar } from '../../src/choice/components/tree/ChoiceTreeToolbar.js';

import { AppProviders } from '../support/providers.js';

type Options = { allFolded?: boolean; foldable?: boolean };

function renderToolbar(
    { allFolded = false, foldable = true }: Options = {},
    left?: ReactNode,
): { onFoldAll: ReturnType<typeof vi.fn>; onNeedleChange: ReturnType<typeof vi.fn> } {
    const onFoldAll = vi.fn();
    const onNeedleChange = vi.fn();

    render(
        <ChoiceTreeToolbar
            allFolded={allFolded}
            foldable={foldable}
            needle=""
            onFoldAll={onFoldAll}
            onNeedleChange={onNeedleChange}
        >
            {left}
        </ChoiceTreeToolbar>,
        { wrapper: AppProviders },
    );

    return { onFoldAll, onNeedleChange };
}

function filter(): HTMLElement {
    return screen.getByRole('searchbox', { name: 'Filter by name' });
}

describe('the line above a choice tree', () => {
    it('hands over what is typed in the filter', () => {
        const { onNeedleChange } = renderToolbar();

        filter().textContent = 'place';
        fireEvent.input(filter());

        expect(onNeedleChange).toHaveBeenCalledWith('place');
    });

    it('offers to fold everything while some branch is open, and asks for it with a press', () => {
        const { onFoldAll } = renderToolbar();

        fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));

        expect(onFoldAll).toHaveBeenCalledTimes(1);
    });

    it('offers to open everything once every branch is folded', () => {
        renderToolbar({ allFolded: true });

        expect(screen.getByRole('button', { name: 'Expand all' })).toBeEnabled();
        expect(screen.queryByRole('button', { name: 'Collapse all' })).toBeNull();
    });

    it('leaves the button out of reach when there is no branch to fold', () => {
        renderToolbar({ foldable: false });

        expect(screen.getByRole('button', { name: 'Collapse all' })).toBeDisabled();
    });

    it('lets the filter take the whole line when the owner puts nothing at its left', () => {
        renderToolbar();

        expect(byPart('choice-tree-toolbar')).toContainElement(filter());
        expect(filter().closest('[class*="flex-1"]')).not.toBeNull();
    });

    it('keeps what the owner puts at the left, and gives the filter a size of its own', () => {
        renderToolbar({}, <span>Format</span>);

        expect(byPart('choice-tree-toolbar')).toHaveTextContent('Format');
        expect(filter().closest('[class*="w-48"]')).not.toBeNull();
    });
});
