import { useMessages } from '@mandor/i18n';
import { useShellStore } from '@mandor/shell';
import { RowList } from '@mandor/ui';
import { useStore } from 'zustand';

import { docsStore } from '../../docs-store.js';
import { DocDeleteDialog } from './DocDeleteDialog.js';
import { DocRow } from './DocRow.js';

/**
 * The notes of the workspace, listed flat by title. A folder tree belongs to the collection and
 * arrives with it; a flat list is what `docs/` is today and nothing here has to be undone to get one.
 *
 * It reads nothing: folding the section unmounts this body, so the read lives with the window in
 * `WorkspaceDocs`.
 *
 * An empty folder draws nothing: the section is then only its header, whose add action is the
 * way to fill it.
 */
export function DocsSidebar() {
    const messages = useMessages('docs');
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const docs = useStore(docsStore, (state) => state.docs);

    if (workspaceId === null || docs.length === 0) {
        return null;
    }

    return (
        <RowList className="flex flex-col" data-part="docs" label={messages('heading')}>
            {docs.map((doc) => (
                <DocRow
                    key={doc.name}
                    name={doc.name}
                    title={doc.title}
                    workspaceId={workspaceId}
                />
            ))}
            <DocDeleteDialog workspaceId={workspaceId} />
        </RowList>
    );
}
