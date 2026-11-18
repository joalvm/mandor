import { SidebarSection, SidebarSectionActions, SidebarSectionBody } from '@mandor/shell';

import { ConnectionsSidebar } from './ConnectionsSidebar.js';
import { NewConnectionEntry } from './NewConnectionEntry.js';

/** The section of the lateral that lists the connections, which a tab of one shows itself in. */
export const CONNECTIONS_SECTION_ID = 'connections';

type ConnectionsSectionProps = {
    /** Where it sits among the other sections is of the app. */
    order: number;
};

/**
 * Puts the connections of the workspace in the lateral while it is mounted. Its header starts a
 * new one, as the add of the strip of tabs does: it opens in a tab, which is where it lives.
 */
export function ConnectionsSection({ order }: ConnectionsSectionProps) {
    return (
        <SidebarSection id={CONNECTIONS_SECTION_ID} order={order} title="connections:heading">
            <SidebarSectionActions>
                <NewConnectionEntry />
            </SidebarSectionActions>
            <SidebarSectionBody>
                <ConnectionsSidebar />
            </SidebarSectionBody>
        </SidebarSection>
    );
}
