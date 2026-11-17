import { shellStore, shownTabId } from '@mandor/shell';

/** What a tab showing one response example of a request calls itself in the session. */
export const EXAMPLE_TAB_KIND = 'request-example';

/**
 * Shows an example in its own tab. Beside, it goes to the group next to the focused one, which is
 * made when there is none; it is kept there, since someone who asks for the side wants it to stay.
 * Otherwise it opens where the focus is, and only as a look when `preview` says so. A tab that
 * followed the example through a rename or a move is the one that comes forward.
 */
export function openExample(
    resource: string,
    { beside, preview }: { beside: boolean; preview: boolean },
): void {
    const shell = shellStore.getState();
    const id = shownTabId(EXAMPLE_TAB_KIND, resource, `${EXAMPLE_TAB_KIND}-${resource}`);
    const tab = { id, kind: EXAMPLE_TAB_KIND, resource };

    if (beside) {
        shell.openTabAside(tab);

        return;
    }

    shell.openTab(shell.activeGroupId, tab, { preview });
}
