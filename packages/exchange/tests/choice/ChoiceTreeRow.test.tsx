import { Tree } from '@mandor/ui';
import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ChoiceTreeRow } from '../../src/choice/components/tree/ChoiceTreeRow.js';
import type { ChoiceNode, ChoiceState } from '../../src/choice/lib/choice-state.js';

import { AppProviders } from '../support/providers.js';

function node(label: string, extra: Partial<ChoiceNode> = {}): ChoiceNode {
    return { children: [], icon: null, id: label, label, ...extra };
}

/** A row is a line of a tree, and it only draws inside one. */
function renderRow(
    choice: ChoiceNode,
    { state = 'checked' }: { state?: ChoiceState } = {},
): ReturnType<typeof vi.fn> {
    const onToggle = vi.fn();

    render(
        <Tree label="Choice" lines={[{ id: choice.id, level: 1 }]} onExpandedChange={vi.fn()}>
            <ChoiceTreeRow node={choice} onToggle={onToggle} state={state} />
        </Tree>,
        { wrapper: AppProviders },
    );

    return onToggle;
}

describe('a choice tree row', () => {
    it('shows no count beside the name, on a branch or on a leaf', () => {
        renderRow(node('orders', { children: [node('a')] }));

        expect(screen.queryByText(/\/\d+/u)).toBeNull();
    });

    it('wears the verb of a request in a slot of its own, in place of the glyph', () => {
        renderRow(node('place', { icon: 'http', mark: 'POST' }), { state: 'unchecked' });

        expect(byPart('method-mark')).toHaveTextContent('POST');
        expect(screen.getByRole('treeitem').querySelector('svg')).toBeNull();
    });

    it('draws the box as checked, empty or indeterminate by the state it is given', () => {
        const { unmount } = render(<span />);

        unmount();
        renderRow(node('orders'), { state: 'mixed' });

        expect(byPart('checkbox')).toHaveAttribute('aria-checked', 'mixed');
    });

    it('draws the glyph of the node, and none when it has none', () => {
        renderRow(node('orders', { icon: 'folder' }));

        expect(screen.getByRole('treeitem').querySelector('svg')).not.toBeNull();
    });

    it('marks the node from its checkbox', () => {
        const onToggle = renderRow(node('orders'));

        fireEvent.click(byPart('checkbox'));

        expect(onToggle).toHaveBeenCalledTimes(1);
    });

    it('leaves a node with a reason red, its box out of reach, and explains it in a tooltip', async () => {
        renderRow(node('queues', { reason: 'the protocol "mqtt" has no transport' }), {
            state: 'unchecked',
        });

        expect(byPart('checkbox')).toHaveAttribute('disabled');
        expect(screen.getByRole('treeitem').querySelector('.text-text-error')).not.toBeNull();

        fireEvent.focus(screen.getByText('queues'));

        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'the protocol "mqtt" has no transport',
        );
    });

    it('bars a node with an empty reason without a word to say about it', () => {
        renderRow(node('clash', { reason: '' }), { state: 'unchecked' });

        fireEvent.focus(screen.getByText('clash'));

        expect(byPart('checkbox')).toHaveAttribute('disabled');
        expect(screen.queryByRole('tooltip')).toBeNull();
        expect(screen.getByRole('treeitem').querySelector('.text-text-error')).toBeNull();
    });

    it('puts no tooltip on a node that can be chosen', () => {
        renderRow(node('health'));

        fireEvent.focus(screen.getByText('health'));

        expect(screen.queryByRole('tooltip')).toBeNull();
        expect(screen.getByRole('treeitem').querySelector('[data-part="row-note"]')).toBeNull();
    });

    it('says what a node lost in a tooltip, with a quiet glyph, and leaves its box open', async () => {
        renderRow(node('orders', { note: 'the folder description is not imported' }));

        expect(byPart('checkbox')).not.toHaveAttribute('disabled');
        expect(screen.getByRole('treeitem').querySelector('.text-text-error')).toBeNull();
        expect(byPart('row-note')).toBeInTheDocument();

        fireEvent.focus(screen.getByText('orders'));

        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'the folder description is not imported',
        );
    });

    it('gives the reason and not the note to a node that has both', async () => {
        renderRow(node('queues', { note: 'a note', reason: 'a reason' }), { state: 'unchecked' });

        fireEvent.focus(screen.getByText('queues'));

        expect(await screen.findByRole('tooltip')).toHaveTextContent('a reason');
        expect(screen.queryByText('a note')).toBeNull();
        expect(screen.getByRole('treeitem').querySelector('[data-part="row-note"]')).toBeNull();
    });
});
