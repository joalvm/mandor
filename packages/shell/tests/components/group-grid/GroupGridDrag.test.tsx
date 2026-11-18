import { MessagesProvider } from '@mandor/i18n';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { dragTabOnto } from '@mandor/shell/testing';
import { TooltipProvider } from '@mandor/ui';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GroupGrid, shellStore, type Tab, useTab } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';

function ShownResource() {
    return <p>{`Contenido de ${useTab().resource}`}</p>;
}

const UNREGISTER: (() => void)[] = [];

function tabFor(id: string): Tab {
    return { id, kind: 'doc', resource: `mandor://demo/payments/doc/${id}.md` };
}

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

/** Two groups side by side, one tab in each, which is the smallest window a drag can cross. */
function scene(): void {
    shellStore.getState().reset();
    shellStore.getState().openTab(ROOT_GROUP_ID, tabFor('one'));

    const right = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

    shellStore.getState().openTab(right, tabFor('two'));
}

function draw() {
    return render(<GroupGrid />, { wrapper: Wrapper });
}

function tabOf(name: string): Element {
    const tab = screen.getByText(name).closest('.dv-tab');

    if (tab === null) {
        throw new Error(`the window is drawing no tab for ${name}`);
    }

    return tab;
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('dragging a tab between the groups of the window', () => {
    beforeEach(() => {
        UNREGISTER.push(
            declareTabKindSpec({
                id: 'doc',
                closable: true,
                icon: 'file',
                body: <ShownResource />,
                title: (resource) => resource.slice(resource.lastIndexOf('/') + 1),
            }),
        );
    });

    /** The window keeps the tree, so a tab let go on another strip belongs to that group now. */
    it('moves the tab to the group it was dropped on, and closes the one it left empty', async () => {
        scene();

        const { container } = draw();
        const groups = [...container.querySelectorAll('.dv-groupview')];

        await dragTabOnto(tabOf('one.md'), groups[1] ?? container);

        const [left] = leavesOf(shellStore.getState().grid);

        expect(leavesOf(shellStore.getState().grid)).toHaveLength(1);
        expect(left?.tabs.map((tab) => tab.id)).toEqual(['two', 'one']);
    });

    /** Dragging a tab is choosing it: the one opened only to look at it arrives kept. */
    it('keeps the tab it carries', async () => {
        scene();
        shellStore.getState().openTab(ROOT_GROUP_ID, tabFor('three'), { preview: true });

        const { container } = draw();
        const groups = [...container.querySelectorAll('.dv-groupview')];

        await dragTabOnto(tabOf('three.md'), groups[1] ?? container);

        expect(JSON.stringify(shellStore.getState().grid)).not.toContain('preview');
    });

    /** Let go on the middle a tab joins the strip; let go on an edge it takes half the room. */
    it('splits the group along the edge the tab was let go on', async () => {
        scene();

        const { container } = draw();
        const groups = [...container.querySelectorAll('.dv-groupview')];

        await dragTabOnto(tabOf('one.md'), groups[1] ?? container, 'bottom');

        expect(shellStore.getState().grid).toMatchObject({
            axis: 'column',
            children: [
                { kind: 'leaf', tabs: [{ id: 'two' }] },
                { kind: 'leaf', tabs: [{ id: 'one' }] },
            ],
        });
    });
});
