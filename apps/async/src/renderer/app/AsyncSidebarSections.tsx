import {
    CollectionRowAction,
    CollectionsSection,
    CollectionsSectionAction,
    WorkspaceSearch,
} from '@mandor/collections';
import { DocsSection, workspaceDocEntries } from '@mandor/docs';
import { openManagedEnvironments, workspaceEnvironmentEntries } from '@mandor/env';

import { ConnectionsSection } from '../features/connections/index.js';
import { AsyncExportAction } from './AsyncExportAction.js';
import { AsyncExportLine } from './AsyncExportLine.js';
import { AsyncImportAction } from './AsyncImportAction.js';

const SEARCH_SOURCES = [workspaceDocEntries, workspaceEnvironmentEntries];

/**
 * The order of the lateral, decided by the app and not by whoever declares. A feature says
 * what it draws; where it sits among the others is a decision of the window. The searcher is
 * not in the list: it is the header of the bar, and collection declares it.
 *
 * The collections carry the door of the documents: importing from the header, exporting from the
 * menu of each collection.
 */
export function AsyncSidebarSections() {
    return (
        <>
            <ConnectionsSection order={30} />
            <CollectionsSection order={20}>
                <CollectionsSectionAction id="import">
                    <AsyncImportAction />
                </CollectionsSectionAction>
                <CollectionsSectionAction id="export">
                    <AsyncExportAction />
                </CollectionsSectionAction>
                <CollectionRowAction id="export" kind="collection">
                    <AsyncExportLine />
                </CollectionRowAction>
            </CollectionsSection>
            <DocsSection order={10} />
            <WorkspaceSearch openEnvironment={openManagedEnvironments} sources={SEARCH_SOURCES} />
        </>
    );
}
