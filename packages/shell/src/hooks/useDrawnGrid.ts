import { useTranslator } from '@mandor/i18n';
import type { GridNode } from '@mandor/ipc';
import type { DockviewApi, DockviewGroupPanel } from 'dockview';
import { useEffect, useEffectEvent, useState } from 'react';

import { dockviewLayoutOf } from '../grid/dockview-layout.js';
import { emptyGroupHosts, type EmptyGroupHost } from '../grid/empty-group-hosts.js';
import {
    gridPointingOf,
    gridStructureOf,
    pointGrid,
    type PointableView,
} from '../grid/grid-pointing.js';
import { groupsNamed, type GroupName } from '../grid/group-names.js';
import { tabTitleOf } from '../tab/tab-title.js';
import type { Tab } from '../tab/tab.js';

/** Under this a group is a sliver with no room for a tab, so nothing may drag it there. */
const MIN_GROUP = 120;

/** A group as a build leaves it: named, read for its blank, and held to a size. */
type BuiltGroup = Pick<DockviewGroupPanel, 'element' | 'id'> & {
    api: Pick<DockviewGroupPanel['api'], 'setConstraints'>;
};

/** What drawing the tree asks of the view: to be built from a layout, and pointed into. */
type DrawnView = PointableView & Pick<DockviewApi, 'fromJSON'> & { groups: readonly BuiltGroup[] };

/** What the grid draws: the tree on screen, the group in front, the names of the groups. */
type DrawnGrid = {
    activeGroupId: string;
    names: readonly GroupName[];
    redrawn: number;
    shown: GridNode;
};

/**
 * Draws the tree in the view: built again when its groups, tabs or titles change, and only
 * pointed into when what changed is the tab or the group in front. Answers the empty groups the
 * build left, and the structure it was built from for whoever must follow a build.
 */
export function useDrawnGrid(
    api: DrawnView | null,
    { activeGroupId, names, redrawn, shown }: DrawnGrid,
): { blanks: EmptyGroupHost[]; structure: string } {
    const [blanks, setBlanks] = useState<EmptyGroupHost[]>([]);
    const translate = useTranslator();
    const titleOf = (tab: Tab): string => tabTitleOf(tab, translate);
    const structure = gridStructureOf(shown, titleOf);
    const pointing = gridPointingOf(shown, activeGroupId);
    // A new list on every render names the same groups: the text of it is what changes.
    const named = JSON.stringify(names);

    // A build carries what is in front at that moment, so it draws the right panels at once; what
    // is in front is no reason to build.
    const build = useEffectEvent((view: DrawnView): void => {
        view.fromJSON(dockviewLayoutOf(shown, activeGroupId, titleOf));

        for (const group of view.groups) {
            group.api.setConstraints({ minimumWidth: MIN_GROUP, minimumHeight: MIN_GROUP });
        }

        groupsNamed(view, names);
        setBlanks(emptyGroupHosts(view));
    });

    const point = useEffectEvent((view: DrawnView): void => {
        pointGrid(view, shown, activeGroupId);
    });

    useEffect(() => {
        if (api !== null) {
            // The empty groups exist only once dockview built them: they are read off the view.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            build(api);
        }
    }, [api, structure, named, redrawn]);

    useEffect(() => {
        if (api !== null) {
            point(api);
        }
    }, [api, pointing]);

    return { blanks, structure };
}
