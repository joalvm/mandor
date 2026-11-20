import { MessagesProvider } from '@mandor/i18n';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { DockviewGroupPanel } from 'dockview';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SplitGroupButton } from '../../../src/components/tab-strip/SplitGroupButton.js';
import { shellStore } from '../../../src/index.js';

function draw(groupId: string): void {
    render(
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>
                <SplitGroupButton group={{ id: groupId } as DockviewGroupPanel} />
            </TooltipProvider>
        </MessagesProvider>,
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

describe('the split at the end of the strip', () => {
    it('splits its group to the right', () => {
        draw(ROOT_GROUP_ID);

        fireEvent.click(screen.getByRole('button', { name: 'Dividir el grupo a la derecha' }));

        expect(leavesOf(shellStore.getState().grid)).toHaveLength(2);
    });

    /** The strip it stands on says which group: the focus may be in another one. */
    it('splits the group it is drawn on, not the one with the focus', () => {
        const other = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

        shellStore.getState().focusGroup(ROOT_GROUP_ID);
        draw(other);
        fireEvent.click(screen.getByRole('button', { name: 'Dividir el grupo a la derecha' }));

        const ids = leavesOf(shellStore.getState().grid).map((leaf) => leaf.id);

        // The new group opens right of the one drawn on, so it comes after it, last.
        expect(ids).toHaveLength(3);
        expect(ids.slice(0, 2)).toEqual([ROOT_GROUP_ID, other]);
    });
});
