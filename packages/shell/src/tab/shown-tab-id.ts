import { selectTabs } from '../selectors.js';
import { shellStore } from '../shell-store.js';

/**
 * The id a tab of a resource opens under: the one of the tab that already shows it. A move
 * rewrites the resource of a tab and leaves the id it was born under, so an id derived from the
 * new path would find nothing and open a second tab of the same thing.
 */
export function shownTabId(kind: string, resource: string, derived: string): string {
    const shown = selectTabs(shellStore.getState()).filter(
        (tab) => tab.kind === kind && tab.resource === resource,
    );

    return shown.some((tab) => tab.id === derived) ? derived : (shown[0]?.id ?? derived);
}
