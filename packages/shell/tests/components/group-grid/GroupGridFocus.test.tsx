import { MessagesProvider } from '@mandor/i18n';
import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, render } from '@testing-library/react';
import { type ReactNode, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { GroupGrid, shellStore, type Tab, useTab, useTabOpened } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';

function ShownResource() {
    return <p>{`Contenido de ${useTab().resource}`}</p>;
}

/** A body that puts the focus on its own field the first time its tab is drawn. */
function AddressFirst() {
    const field = useRef<HTMLInputElement>(null);

    useTabOpened(() => {
        field.current?.focus();
    });

    return <input aria-label="Address" ref={field} />;
}

const cleanups: (() => void)[] = [];

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

/** Two groups side by side, the one on the right in front. */
function drawTwoGroups(): { container: HTMLElement; left: string; right: string } {
    shellStore.getState().openTab(ROOT_GROUP_ID, tabFor('one'));

    const right = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

    shellStore.getState().openTab(right, tabFor('two'));

    const { container } = render(<GroupGrid />, { wrapper: Wrapper });

    return { container, left: ROOT_GROUP_ID, right };
}

/** A control of the window outside the grid, the way a line of the lateral is one. */
function focusedOutside(): HTMLElement {
    const outside = document.createElement('button');

    document.body.append(outside);
    cleanups.push(() => {
        outside.remove();
    });
    outside.focus();

    return outside;
}

beforeEach(() => {
    shellStore.getState().reset();
    cleanups.push(
        declareTabKindSpec({
            id: 'doc',
            closable: true,
            icon: 'file',
            body: <ShownResource />,
            title: (resource) => resource.slice(resource.lastIndexOf('/') + 1),
        }),
        declareTabKindSpec({
            id: 'address',
            closable: true,
            icon: 'file',
            body: <AddressFirst />,
            title: () => 'Address',
        }),
    );
});

afterEach(() => {
    // The grid comes down before its kind does: a kind leaving redraws every tab still drawn.
    cleanup();

    for (const undo of cleanups.splice(0)) {
        undo();
    }
});

describe('where the grid leaves the focus', () => {
    /** Clicking an item of the collection opens it, and the next key still speaks to the tree. */
    it('leaves it outside the grid when a tab opens in the group already in front', () => {
        const { right } = drawTwoGroups();
        const outside = focusedOutside();

        act(() => {
            shellStore.getState().openTab(right, tabFor('three'));
        });

        expect(outside).toHaveFocus();
    });

    it('still follows the work into the group that comes to the front', () => {
        const { container, left } = drawTwoGroups();

        focusedOutside();
        act(() => {
            shellStore.getState().focusGroup(left);
        });

        const groups = [...container.querySelectorAll('.dv-groupview')];

        expect(leavesOf(shellStore.getState().grid)[0]?.id).toBe(left);
        expect(groups[0]?.contains(document.activeElement)).toBe(true);
    });

    /** A tab opened from inside the grid rebuilds the group under the focus, and gets it back. */
    it('gives it back to the group in front when the focus was inside the grid', () => {
        const { container, right } = drawTwoGroups();
        const groups = () => [...container.querySelectorAll('.dv-groupview')];

        act(() => {
            shellStore.getState().openTab(right, tabFor('three'));
        });

        expect(groups()[1]?.contains(document.activeElement)).toBe(true);
    });

    /** A tab just born that asks for its own field keeps it, wherever the focus came from. */
    it('leaves it on the field a tab just born took, from outside the grid or from inside it', () => {
        const { container, right } = drawTwoGroups();

        focusedOutside();
        act(() => {
            shellStore.getState().openTab(right, { id: 'new', kind: 'address', resource: 'x' });
        });

        expect(container.querySelector('input')).toHaveFocus();

        act(() => {
            shellStore.getState().openTab(right, { id: 'other', kind: 'address', resource: 'y' });
        });

        const fields = [...container.querySelectorAll('input')];

        expect(fields.at(-1)).toHaveFocus();
    });
});
