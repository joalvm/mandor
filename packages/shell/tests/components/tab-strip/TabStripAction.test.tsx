import { ROOT_GROUP_ID } from '@mandor/ipc';
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import type { DockviewGroupPanel } from 'dockview';
import { afterEach, describe, expect, it } from 'vitest';

import { TabStripActions } from '../../../src/components/tab-strip/TabStripActions.js';
import { TabStripAction, useTabStrip } from '../../../src/index.js';
import { TabStripContext } from '../../../src/tab/tab-strip-context.js';

function groupDouble(): DockviewGroupPanel {
    return { id: ROOT_GROUP_ID, panels: [] } as unknown as DockviewGroupPanel;
}

function AddAction() {
    return <span>{`add:${useTabStrip().groupId}`}</span>;
}

afterEach(() => {
    cleanup();
});

describe('an action of the strip declared in the tree', () => {
    it('is drawn in the strip, reading the group it sits in', () => {
        render(
            <>
                <TabStripAction id="add">
                    <AddAction />
                </TabStripAction>
                <TabStripActions group={groupDouble()} />
            </>,
        );

        expect(screen.getByText(`add:${ROOT_GROUP_ID}`)).toBeVisible();
    });

    it('leaves the strip when it unmounts', () => {
        const view = render(
            <>
                <TabStripAction id="add">
                    <span>the add</span>
                </TabStripAction>
                <TabStripActions group={groupDouble()} />
            </>,
        );

        view.rerender(<TabStripActions group={groupDouble()} />);

        expect(screen.queryByText('the add')).toBeNull();
    });
});

describe('useTabStrip', () => {
    it('reads the strip it is drawn in', () => {
        const { result } = renderHook(() => useTabStrip(), {
            wrapper: ({ children }) => (
                <TabStripContext value={{ groupId: 'group-one' }}>{children}</TabStripContext>
            ),
        });

        expect(result.current.groupId).toBe('group-one');
    });

    it('is not read outside a strip', () => {
        expect(() => {
            renderHook(() => useTabStrip());
        }).toThrow('useTabStrip is only read inside an action of a strip of tabs.');
    });
});
