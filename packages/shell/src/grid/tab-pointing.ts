import type { DockviewActivePanelChangeEvent } from 'dockview';

/** What the pointing hears of a change of the tab in front: who made it, and the tab it brought. */
type Pointed = Pick<DockviewActivePanelChangeEvent, 'origin'> & {
    panel: { group: { id: string }; id: string } | undefined;
};

/** The one thing the pointing asks of the view: to be told whenever the tab in front changes. */
type PointingView = {
    onDidActivePanelChange: (listener: (event: Pointed) => void) => { dispose: () => void };
};

/**
 * Which tab of a group the user put in front is pointing too, and the tree decides what it
 * means: it is written on the leaf, so the session keeps it and whoever reads the focused group
 * reads the tab the user is on, not the one the window opened last.
 *
 * The moves the tree made itself come back with the origin 'api' — a layout the view was handed,
 * not a click — and echoing those back would only answer itself.
 */
export function tabPointingOf(
    api: PointingView,
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
