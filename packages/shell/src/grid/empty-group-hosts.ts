import type { DockviewGroupPanel } from 'dockview';

/** A group with nothing in it, and the element the library keeps for what such a group shows. */
export type EmptyGroupHost = readonly [groupId: string, element: Element];

/** What the blanks are read off: the groups of the view, each by its name and its element. */
type GroupsView = { groups: readonly Pick<DockviewGroupPanel, 'element' | 'id'>[] };

/**
 * Where each empty group of the view keeps its blank.
 *
 * The library draws a blank in a group with no tab and removes it when one arrives. What the
 * blank says is drawn into it from here, by the window, and not through the library's own
 * component for it: that one leaves its React portal behind every time the layout is handed
 * over again, and with it the whole group it was drawn in.
 */
export function emptyGroupHosts(api: GroupsView): EmptyGroupHost[] {
    return api.groups.flatMap((group) => {
        const blank = group.element.querySelector('.dv-watermark');

        return blank === null ? [] : [[group.id, blank] as const];
    });
}
