import type { SerializedDockview } from 'dockview';
import { describe, expect, it } from 'vitest';

import { gridFrom } from '../../src/grid/grid-from-layout.js';
import type { Tab } from '../../src/tab/tab.js';

const TABS = new Map<string, Tab>([
    ['one', { id: 'one', kind: 'doc', resource: 'mandor://demo/payments/doc/one.md' }],
    ['two', { id: 'two', kind: 'doc', resource: 'mandor://demo/payments/doc/two.md' }],
]);

/** The view writes its arrangement with a shape it keeps to itself, so a test writes it plainly. */
function layoutOf(root: unknown, orientation = 'HORIZONTAL'): SerializedDockview {
    return {
        grid: { root, width: 1000, height: 800, orientation },
        panels: {},
        activeGroup: 'root',
    } as unknown as SerializedDockview;
}

function group(id: string, views: string[], size: number) {
    return { type: 'leaf', size, data: { views, activeView: views[0], id } };
}

describe('reading back the tree the view arranged', () => {
    /** A window that was never split travels inside a split of one, and comes back without it. */
    it('unwraps the split of one the view demands at the root', () => {
        const grid = gridFrom(
            layoutOf({ type: 'branch', size: 100, data: [group('root', ['one'], 100)] }),
            TABS,
        );

        expect(grid).toEqual({
            kind: 'leaf',
            id: 'root',
            tabs: [TABS.get('one')],
            activeTab: 'one',
        });
    });

    it('turns the pixels of the view into the shares the session keeps', () => {
        const grid = gridFrom(
            layoutOf({
                type: 'branch',
                size: 800,
                data: [group('root', ['one'], 600), group('group-2', ['two'], 200)],
            }),
            TABS,
        );

        expect(grid).toMatchObject({ kind: 'branch', axis: 'row', sizes: [75, 25] });
    });

    /** The view has no pixels to give before it is on screen, and neither group deserves more. */
    it('shares the axis out evenly when the view has not been measured', () => {
        const grid = gridFrom(
            layoutOf({
                type: 'branch',
                size: 0,
                data: [group('root', ['one'], 0), group('group-2', ['two'], 0)],
            }),
            TABS,
        );

        expect(grid).toMatchObject({ sizes: [50, 50] });
    });

    /** The axis of a split is the one the view is not nesting along, and it flips going down. */
    it('flips the axis on every split under the root', () => {
        const grid = gridFrom(
            layoutOf(
                {
                    type: 'branch',
                    size: 800,
                    data: [
                        group('root', ['one'], 400),
                        {
                            type: 'branch',
                            size: 400,
                            data: [group('group-2', ['two'], 200), group('group-3', [], 200)],
                        },
                    ],
                },
                'VERTICAL',
            ),
            TABS,
        );

        expect(grid).toMatchObject({
            axis: 'column',
            children: [{ kind: 'leaf' }, { kind: 'branch', axis: 'row' }],
        });
    });

    /** The view names what it draws; only the session says which of those is a tab of the window. */
    it('leaves out a panel the session never opened', () => {
        const grid = gridFrom(
            layoutOf({ type: 'branch', size: 100, data: [group('root', ['one', 'ghost'], 100)] }),
            TABS,
        );

        expect(grid).toMatchObject({ tabs: [TABS.get('one')], activeTab: 'one' });
    });

    /** A group showing a panel the session does not know is showing nothing at all. */
    it('shows nothing in a group whose tab in front is not one of its own', () => {
        const grid = gridFrom(
            layoutOf({
                type: 'branch',
                size: 100,
                data: [
                    {
                        type: 'leaf',
                        size: 100,
                        data: { views: ['ghost'], activeView: 'ghost', id: 'root' },
                    },
                ],
            }),
            TABS,
        );

        expect(grid).toMatchObject({ tabs: [], activeTab: null });
    });
});
