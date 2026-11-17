import { ROOT_GROUP_ID } from '@mandor/ipc';
import { cleanup, render, screen } from '@testing-library/react';
import type { DockviewGroupPanel } from 'dockview';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { TabStripActions } from '../../../src/components/tab-strip/TabStripActions.js';
import { shellStore, TabStripAction } from '../../../src/index.js';

function groupDouble(): DockviewGroupPanel {
    return { id: ROOT_GROUP_ID, panels: [] } as unknown as DockviewGroupPanel;
}

/** Declares an action the way an app does, in a tree of its own that cleanup takes down. */
function declare(id: string, label: string): void {
    render(
        <TabStripAction id={id}>
            <span>{label}</span>
        </TabStripAction>,
    );
}

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    shellStore.getState().reset();
});

describe('the actions beside the tabs of a strip', () => {
    it('draws every action that was declared', () => {
        declare('add', 'the add');
        declare('other', 'the other add');
        render(<TabStripActions group={groupDouble()} />);

        expect(screen.getByText('the add')).toBeDefined();
        expect(screen.getByText('the other add')).toBeDefined();
    });

    it('draws nothing when nobody declared an action at all', () => {
        const { container } = render(<TabStripActions group={groupDouble()} />);

        expect(container).toBeEmptyDOMElement();
    });
});
