import { MessagesProvider } from '@mandor/i18n';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

/**
 * Three groups: one on the left with two tabs, and two stacked on the right. The tree nests, so
 * the window has one separator between the columns and another between the two on the right.
 */
function scene(): void {
    shellStore.getState().reset();
    shellStore.getState().openTab(ROOT_GROUP_ID, tabFor('one'));
    shellStore.getState().openTab(ROOT_GROUP_ID, tabFor('two'));

    const right = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

    shellStore.getState().openTab(right, tabFor('three'));

    const under = shellStore.getState().splitGroup(right, 'column');

    shellStore.getState().openTab(under, tabFor('four'));
}

function draw() {
    return render(<GroupGrid />, { wrapper: Wrapper });
}

function separatorAt(index: number): Element {
    const separator = screen.getAllByRole('separator')[index];

    if (separator === undefined) {
        throw new Error(`the grid drew no separator at ${String(index)}`);
    }

    return separator;
}

function groupIds(): string[] {
    return leavesOf(shellStore.getState().grid).map((leaf) => leaf.id);
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('the grid of groups', () => {
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

    it('draws one strip per group of the tree', () => {
        scene();
        draw();

        expect(screen.getAllByRole('tablist')).toHaveLength(3);
    });

    it('draws the grid with the theme of the product, not one the library ships', () => {
        scene();

        const { container } = draw();

        expect(container.querySelector('.dockview-theme-mandor')).not.toBeNull();
    });

    /** Only the active tab of each group is on screen. The rest are tabs, not hidden panels. */
    it('shows the active tab of every group and nothing behind it', () => {
        scene();
        draw();

        expect(screen.getByText(/^Contenido de .*two\.md$/)).toBeVisible();
        expect(screen.getByText(/^Contenido de .*three\.md$/)).toBeVisible();
        expect(screen.getByText(/^Contenido de .*four\.md$/)).toBeVisible();
        expect(screen.queryByText(/^Contenido de .*one\.md$/)).toBeNull();
    });

    /** Every move redraws the tree, so the second separator is asked for after the first move. */
    it('saves the shares a separator was moved to with the keyboard', () => {
        scene();
        draw();
        fireEvent.keyDown(separatorAt(0), { key: 'ArrowRight' });
        fireEvent.keyDown(separatorAt(1), { key: 'ArrowDown' });

        expect(shellStore.getState().grid).toMatchObject({
            axis: 'row',
            sizes: [52, 48],
            children: [{ kind: 'leaf' }, { axis: 'column', sizes: [52, 48] }],
        });
    });

    /** Somebody reading one group wants the window, not a sliver of it, and wants it back after. */
    it('draws the maximised group on its own and keeps the rest of the tree to come back to', () => {
        scene();
        shellStore.getState().focusGroup(ROOT_GROUP_ID);
        shellStore.getState().toggleMaximized();
        draw();

        expect(screen.getAllByRole('tablist')).toHaveLength(1);
        expect(screen.getByText(/^Contenido de .*two\.md$/)).toBeVisible();
        expect(screen.queryByText(/^Contenido de .*three\.md$/)).toBeNull();
        expect(groupIds()).toHaveLength(3);
    });

    /** Said after the name the group already has, which is what it shows: heard, not replaced. */
    it('says which group of the window has the focus', () => {
        scene();

        const [, second] = groupIds();

        shellStore.getState().focusGroup(second ?? '');
        draw();

        const group = screen.getAllByRole('region')[1];

        expect(group).toHaveAccessibleName('three.md');
        expect(group).toHaveAccessibleDescription('Grupo 2 de 3');
    });

    it('hands the focus to the group the window says is the active one', () => {
        scene();

        const [, second] = groupIds();

        shellStore.getState().focusGroup(second ?? '');

        const { container } = draw();
        const groups = [...container.querySelectorAll('.dv-groupview')];

        expect(groups[1]?.contains(document.activeElement)).toBe(true);
    });

    /** A click is pointing, not a new grid: a drag begun on a tab of another group lives on. */
    it('keeps every tab where it is drawn when another group or tab comes to the front', () => {
        scene();

        const { container } = draw();
        const drawn = [...container.querySelectorAll('.dv-tab')];

        fireEvent.pointerDown(screen.getByText('three.md'));
        act(() => {
            shellStore.getState().setActiveTab(ROOT_GROUP_ID, 'one');
        });

        expect(drawn).toHaveLength(4);
        expect(drawn.filter((tab) => !tab.isConnected)).toEqual([]);
        expect(screen.getByText(/^Contenido de .*one\.md$/)).toBeVisible();
        expect(screen.queryByText(/^Contenido de .*two\.md$/)).toBeNull();
    });

    it('tells the window which group was pointed at', () => {
        scene();

        const [, second] = groupIds();

        draw();
        fireEvent.pointerDown(screen.getByText('three.md'));

        expect(shellStore.getState().activeGroupId).toBe(second);
    });
});
