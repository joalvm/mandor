import type { DockviewApi } from 'dockview';

/**
 * Which tab of a group the user put in front is pointing too, and the tree decides what it
 * means: it is written on the leaf, so the session keeps it and whoever reads the focused group
 * reads the tab the user is on, not the one the window opened last.
 *
 * The moves the tree made itself come back with the origin 'api' — a layout the view was handed,
 * not a click — and echoing those back would only answer itself.
 */
export function tabPointingOf(
    api: DockviewApi,
    pointed: (groupId: string, tabId: string) => void,
): () => void {
    const heard = api.onDidActivePanelChange((event) => {
        if (event.origin === 'user' && event.panel !== undefined) {
            pointed(event.panel.group.id, event.panel.id);
        }
    });

    return () => {
        heard.dispose();
    };
}
