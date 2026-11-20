import type { ShellStore } from '../shell-store.js';

/**
 * Shows the row of a resource in its section of the sidebar: the section opens if it was folded,
 * and the section goes to the row. The palette asks it for the tab in front; a bar of a tab asks
 * it before an act that happens on the row, such as renaming it.
 */
export function revealInSidebar(state: ShellStore, section: string, resource: string): void {
    const collapsed = state.panels.collapsedSections;

    state.setPanels({ collapsedSections: collapsed.filter((id) => id !== section) });
    state.setRevealing(resource);
}
