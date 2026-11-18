import {
    folderOfResource,
    KEY_HEADER_NAMES,
    KeyValueTable,
    keyValueLinesOf,
    requestLinesOf,
    scheduleFolderSettingsWrite,
    type KeyValueColumns,
    useFolderChain,
} from '@mandor/env';
import { useMessages } from '@mandor/i18n';
import { useFailureToast, useTab } from '@mandor/shell';
import { useState, type ReactNode } from 'react';

/** The columns the table opens with: what each pair carries, without its description. */
const OPENING_COLUMNS: KeyValueColumns = { description: false, value: true };

/**
 * The headers of a collection or a folder, in its tab: the table a request edits its own with,
 * over the first level of the chain. Every request under the group inherits them.
 */
export function FolderHeaders(): ReactNode {
    const labels = useMessages('requests');
    const notifyFailure = useFailureToast();
    const { resource } = useTab();
    const place = folderOfResource(resource);
    const workspaceId = place?.workspaceId ?? null;
    const path = place?.path ?? null;
    const own = useFolderChain(workspaceId, path)[0];
    const [columns, setColumns] = useState<KeyValueColumns>(OPENING_COLUMNS);

    if (own === undefined || workspaceId === null || path === null) {
        return null;
    }

    const headers = own.settings.headers ?? [];

    return (
        <div
            className="grid min-h-0 content-start gap-gap-group p-pad-panel"
            data-part="folder-headers"
        >
            <KeyValueTable
                columns={columns}
                environment={undefined}
                keySuggestions={KEY_HEADER_NAMES}
                lines={keyValueLinesOf(headers)}
                onColumnsChange={setColumns}
                onLinesChange={(lines) => {
                    scheduleFolderSettingsWrite(
                        workspaceId,
                        path,
                        { headers: requestLinesOf(lines, headers) },
                        notifyFailure,
                    );
                }}
                onVariablesChange={() => undefined}
                title={labels('headers')}
                typed
            />
        </div>
    );
}
