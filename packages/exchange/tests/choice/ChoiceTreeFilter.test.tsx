import { byPart } from '@mandor/ui/testing';
import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ALL, boxOf, renderTree, row, texts, typeFilter } from '../support/choice-tree-harness.js';

describe('the filter and the folds of a choice tree', () => {
    it('folds and opens every branch with one button, and keeps the title open', () => {
        renderTree();

        fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));

        expect(texts()).toEqual([
            'Everything',
            'queues',
            'shop',
            'orders',
            'place',
            'cancel',
            'health',
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));

        expect(texts()).toEqual(['Everything', 'queues', 'shop']);
    });

    it('filters by name, opening what holds a match, and the title speaks for what is left', () => {
        renderTree(['place']);

        typeFilter('place');

        expect(texts()).toEqual(['Everything', 'shop', 'orders', 'place']);
        expect(boxOf('Everything')).toHaveAttribute('aria-checked', 'true');
    });

    it('bars the title when the filter leaves nothing to choose', () => {
        const onChange = renderTree();

        typeFilter('zzz');
        fireEvent.click(row('Everything'));

        expect(boxOf('Everything')).toHaveAttribute('disabled');
        expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps what the owner puts at the left of the line above the tree', () => {
        renderTree(ALL, { withLeft: true });

        expect(byPart('choice-tree-toolbar')).toHaveTextContent('Format');
    });

    it('says it is reading, in place of the tree, while it waits for the nodes', () => {
        renderTree(ALL, { loading: true });

        expect(screen.getByText('Reading…')).toBeVisible();
        expect(screen.queryByRole('tree')).toBeNull();
    });
});
