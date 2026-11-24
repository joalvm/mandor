import type { DockviewGroupPanel } from 'dockview';

/** A group and what there is to say about it beyond the tab it shows: which one of the window. */
export type GroupName = readonly [id: string, description: string];

/** What the names are written on: the groups of the view, each by its name and its element. */
type GroupsView = { groups: readonly Pick<DockviewGroupPanel, 'element' | 'id'>[] };

/**
 * Says of every group which one of the window it is.
 *
 * It is said where it belongs: on the thing that took the focus, and after its own name, so that
 * what the group shows is heard first and its place in the window after. A region that announced
 * it from the side would talk over whatever was being read, and would still be there saying it
 * once the reader had moved on.
 */
export function groupsNamed(api: GroupsView, names: readonly GroupName[]): void {
    for (const group of api.groups) {
        const named = names.find(([id]) => id === group.id);

        if (named !== undefined) {
            group.element.setAttribute('aria-description', named[1]);
        }
    }
}
