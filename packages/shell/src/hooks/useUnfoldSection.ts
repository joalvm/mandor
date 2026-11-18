import { use } from 'react';

import { SidebarSectionIdContext } from '../components/sidebar/sidebar-section-context.js';
import { shellStore } from '../shell-store.js';
import { withFolded } from '../sidebar/folded-sections.js';

/**
 * Opens the sidebar section this is drawn in, if it was folded. What a header action starts —
 * a new row being named, say — lives in the body, and a folded body shows nothing of it.
 */
export function useUnfoldSection(): () => void {
    const id = use(SidebarSectionIdContext);

    return () => {
        const { panels, setPanels } = shellStore.getState();

        if (id === null || !panels.collapsedSections.includes(id)) {
            return;
        }

        setPanels({ collapsedSections: withFolded(panels.collapsedSections, id, true) });
    };
}
