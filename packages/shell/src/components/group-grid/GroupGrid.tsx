import { useMessages } from '@mandor/i18n';
import { leavesOf } from '@mandor/ipc';
import type { DockviewApi, DockviewReadyEvent, DockviewTheme } from 'dockview';
import { DockviewReact } from 'dockview-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { TAB_COMPONENT } from '../../grid/dockview-layout.js';
import { focusHeldElsewhere, focusInsideContent } from '../../grid/focus-held-elsewhere.js';
import { gridFrom } from '../../grid/grid-from-layout.js';
import { maximizedGrid } from '../../grid/grid-maximize.js';
import { sashesOf } from '../../grid/grid-sashes.js';
import { tabsByName } from '../../grid/grid-tabs.js';
import { GroupGridContext } from '../../grid/group-grid-scope.js';
import type { GroupName } from '../../grid/group-names.js';
import { pinnedFirstGrid } from '../../grid/leaf-pins.js';
import { sashKeysAttached } from '../../grid/sash-keys.js';
import { tabPointingOf } from '../../grid/tab-pointing.js';
import { useDrawnGrid } from '../../hooks/useDrawnGrid.js';
import { useGridView } from '../../hooks/useGridView.js';
import { shellStore } from '../../shell-store.js';
import { GroupTab } from './GroupTab.js';
import { GroupTabContent } from './GroupTabContent.js';
import { GroupWatermark } from './GroupWatermark.js';
import { TabListMenu } from '../tab-strip/TabListMenu.js';
import { TabStripActions } from '../tab-strip/TabStripActions.js';

/** The grid is drawn with the tokens of the product. None of the themes of the library ships. */
const THEME: DockviewTheme = { name: 'mandor', className: 'dockview-theme-mandor' };

/** The one panel the library draws in every group: the body of the tab in front. */
const COMPONENTS = { [TAB_COMPONENT]: GroupTabContent };

/** The slot dockview puts right after the tabs: the add of the kinds the strip holds. */
function LeftHeaderActions(props: Parameters<typeof TabStripActions>[0]) {
    return <TabStripActions {...props} />;
}

/**
 * The groups of the window, drawn from the tree the session keeps.
 *
 * The tree is the source and this is the view of it: the layout is read off the tree on every
 * change and handed over whole. What comes back the other way is not layout but pointing — which
 * group somebody clicked into, and which tab of it they put in front — and the tree decides what
 * that means.
 *
 * Everything the view is handed travels as text, so a window that did not change is redrawn as
 * often as it changed: never. Handing the same layout over again would tear down every panel of
 * every group and take the work inside them with it. For the same reason a click is not a new
 * layout: what it changes — the tab in front, the group in front — is put in front of the grid
 * already built, and only a change of groups, tabs or titles builds it again.
 *
 * The tree it draws and the moves it reports are read and written where the session keeps them.
 * A window that carried them through props would be relaying state it never looks at.
 */
export function GroupGrid() {
    const messages = useMessages('shell');
    const {
        activeGroupId,
        closeTab,
        focusGroup,
        grid,
        maximizedGroupId,
        rearrangeGrid,
        resizeGrid,
        resources,
        setActiveTab,
    } = useGridView();
    const root = useRef<HTMLDivElement>(null);
    const focused = useRef<string | null>(null);
    const [api, setApi] = useState<DockviewApi | null>(null);
    const [redrawn, setRedrawn] = useState(0);
    const shown = maximizedGrid(grid, maximizedGroupId);
    const label = messages('resizeGroups');
    const names = leavesOf(grid).map((leaf, index, all): GroupName => [
        leaf.id,
        messages('activeGroup', { index: index + 1, total: all.length }),
    ]);
    const scope = useMemo(() => ({ onCloseTab: closeTab, resources }), [closeTab, resources]);
    const { blanks, structure } = useDrawnGrid(api, { activeGroupId, names, redrawn, shown });

    /**
     * The focus goes where the window says the work is, and follows it when it moves to another
     * group. A grid rebuilt under the focus gives it back; one rebuilt beside it leaves it be: a
     * tab opened from the lateral is not the work moving. A focus already inside what the group
     * shows is where the work is: a tab just opened put it on its first field.
     */
    useEffect(() => {
        if (api === null) {
            return;
        }

        const moved = focused.current !== activeGroupId;

        focused.current = activeGroupId;

        const group = api.groups.find((candidate) => candidate.id === activeGroupId);

        if ((moved || !focusHeldElsewhere(root.current)) && !focusInsideContent(group?.element)) {
            group?.focus();
        }
    }, [activeGroupId, api, structure]);

    useEffect(() => {
        const pointed = api?.onDidActiveGroupChange((group) => {
            if (group !== undefined) {
                focusGroup(group.id);
            }
        });

        return () => {
            pointed?.dispose();
        };
    }, [api, focusGroup]);

    /**
     * The tab the user puts in front is pointing too, and the tree writes it on the leaf: the
     * session keeps it, and whoever asks for the focused group asks for the tab the user is on.
     */
    useEffect(() => {
        if (api === null) {
            return;
        }

        return tabPointingOf(api, setActiveTab);
    }, [api, setActiveTab]);

    /**
     * A drag is made in the view, so the view answers with the arrangement it ended up with and
     * the window takes it whole. It is the only thing the view is allowed to say about the tree.
     * Dragging a tab is choosing it: one opened only to look at it arrives kept.
     *
     * A tab dropped across the pinned goes back to its side, and the view has to be drawn again:
     * the tree it is drawn from may not have changed at all.
     */
    useEffect(() => {
        const moved = api?.onDidMovePanel((event) => {
            const arranged = gridFrom(api.toJSON(), tabsByName(grid));

            rearrangeGrid(arranged, event.to.id);
            shellStore.getState().keepTab(event.panel.id);

            if (pinnedFirstGrid(arranged) !== arranged) {
                setRedrawn((count) => count + 1);
            }
        });

        return () => {
            moved?.dispose();
        };
    }, [api, grid, rearrangeGrid]);

    useEffect(
        () => sashKeysAttached(root.current, sashesOf(shown), resizeGrid, label),
        [api, label, resizeGrid, shown, structure],
    );

    return (
        <GroupGridContext value={scope}>
            <div
                className="min-h-0 min-w-0 flex-1 overflow-hidden"
                data-part="group-grid"
                ref={root}
            >
                <DockviewReact
                    components={COMPONENTS}
                    defaultTabComponent={GroupTab}
                    // The list at the end of the strip replaces the one dockview draws.
                    disableTabsOverflowList
                    leftHeaderActionsComponent={LeftHeaderActions}
                    noPanelsOverlay="emptyGroup"
                    onReady={(event: DockviewReadyEvent) => {
                        setApi(event.api);
                    }}
                    rightHeaderActionsComponent={TabListMenu}
                    theme={THEME}
                />
                {blanks.map(([groupId, element]) =>
                    createPortal(<GroupWatermark />, element, groupId),
                )}
            </div>
        </GroupGridContext>
    );
}
