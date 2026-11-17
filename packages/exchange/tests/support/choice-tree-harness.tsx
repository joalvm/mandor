import { byPart } from '@mandor/ui/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { vi } from 'vitest';

import { ChoiceTree } from '../../src/choice/components/tree/ChoiceTree.js';
import type { ChoiceNode } from '../../src/choice/lib/choice-state.js';

import { AppProviders } from './providers.js';

function node(id: string, children: ChoiceNode[] = [], reason?: string): ChoiceNode {
    return { children, icon: null, id, label: id, reason };
}

const NODES = [
    node('queues', [], 'the protocol "mqtt" has no transport'),
    node('shop', [node('orders', [node('place'), node('cancel')]), node('health')]),
];

export const ALL = ['place', 'cancel', 'health'];

type HarnessProps = {
    initial: string[];
    loading?: boolean;
    onChange: () => void;
    withLeft?: boolean;
};

function Harness({ initial, loading = false, onChange, withLeft = false }: HarnessProps) {
    const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set(initial));

    return (
        <ChoiceTree
            chosen={chosen}
            label="What would enter"
            loading={loading}
            nodes={NODES}
            onChange={(next) => {
                onChange();
                setChosen(next);
            }}
            title="Everything"
        >
            {withLeft ? <span>Format</span> : null}
        </ChoiceTree>
    );
}

export function renderTree(
    initial = ALL,
    options: Pick<HarnessProps, 'loading' | 'withLeft'> = {},
): ReturnType<typeof vi.fn> {
    const onChange = vi.fn();

    render(<Harness initial={initial} onChange={onChange} {...options} />, {
        wrapper: AppProviders,
    });

    return onChange;
}

export function row(name: string): HTMLElement {
    return screen.getByRole('treeitem', { name });
}

export function boxOf(name: string): HTMLElement {
    return byPart('checkbox', row(name));
}

/** The side arrows fold from the keyboard, as a press on the row of a branch does. */
export function unfold(name: string): void {
    fireEvent.keyDown(row(name), { key: 'ArrowRight' });
}

/** The filter is a line of editable text: typing is setting its text and telling it so. */
export function typeFilter(value: string): void {
    const field = screen.getByRole('searchbox', { name: 'Filter by name' });

    field.textContent = value;
    fireEvent.input(field);
}

export function texts(): (string | null)[] {
    return screen.getAllByRole('treeitem').map((item) => item.textContent);
}
