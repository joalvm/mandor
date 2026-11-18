import {
    CollectionRowAction,
    CollectionsSection,
    CollectionsSectionAction,
    WorkspaceSearch,
} from '@mandor/collections';
import { DocsSection, workspaceDocEntries } from '@mandor/docs';
import { openManagedEnvironments, workspaceEnvironmentEntries } from '@mandor/env';

import {
    ExampleRowActions,
    FolderAuthLine,
    RequestExampleRowActions,
} from '../features/requests/index.js';
import { SyncExportAction } from './SyncExportAction.js';
import { SyncExportLine } from './SyncExportLine.js';
import { SyncImportAction } from './SyncImportAction.js';

const SEARCH_SOURCES = [workspaceDocEntries, workspaceEnvironmentEntries];

/**
 * The lateral of Mandor Request: the collection of the workspace and its documentation, in that
 * order. No connections section — a connection is of Async. The searcher is not in the list:
 * it is the header of the bar, and collection declares it.
 *
 * The collections carry the door of the documents: importing from the header, exporting from the
 * menu of each collection. A collection and each of its folders open from their menu the auth
 * their requests inherit.
 */
export function SyncSidebarSections() {
    return (
        <>
            <CollectionsSection order={20}>
                <CollectionsSectionAction id="import">
                    <SyncImportAction />
                </CollectionsSectionAction>
                <CollectionsSectionAction id="export">
                    <SyncExportAction />
                </CollectionsSectionAction>
                <CollectionRowAction id="export" kind="collection">
                    <SyncExportLine />
                </CollectionRowAction>
                <CollectionRowAction id="collection-auth" kind="collection">
                    <FolderAuthLine />
                </CollectionRowAction>
                <CollectionRowAction id="folder-auth" kind="folder">
                    <FolderAuthLine />
                </CollectionRowAction>
                <CollectionRowAction id="request-examples" kind="item">
                    <RequestExampleRowActions />
                </CollectionRowAction>
                <CollectionRowAction id="example-as-request" kind="example">
                    <ExampleRowActions />
                </CollectionRowAction>
            </CollectionsSection>
            <DocsSection order={10} />
            <WorkspaceSearch openEnvironment={openManagedEnvironments} sources={SEARCH_SOURCES} />
        </>
    );
}
