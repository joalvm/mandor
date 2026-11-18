import { useMessages } from '@mandor/i18n';
import type { FolderChainLevel } from '@mandor/schema';
import { useFailureToast, useTab } from '@mandor/shell';
import type { ScopeLevelName } from '@mandor/vars';
import { useState, type ReactNode } from 'react';
import { useStore } from 'zustand';

import { envStore } from '../../env-store.js';
import { useFolderChain } from '../../hooks/useFolderChain.js';
import { folderOfResource } from '../../lib/folder-of-resource.js';
import { rulingEnvironmentId } from '../../lib/ruling-environment.js';
import { useVariableLines } from '../../hooks/useVariableLines.js';
import { scheduleFolderVariablesWrite } from '../../lib/pending-folder-variables-write.js';
import { variableNotes, type VariableNote } from '../../lib/variable-notes.js';
import { windowScope } from '../../lib/window-scope.js';
import { blocksTheWrite } from '../../lib/writable-variables.js';
import { KeyValueTable } from '../key-value/KeyValueTable.js';
import type { KeyValueColumns, KeyValueLine } from '../key-value/key-value-line.js';

const COLUMNS: KeyValueColumns = { description: false, value: true };

/** The level of the scope a level of the chain resolves as. */
const SCOPE_LEVEL: Record<FolderChainLevel['level'], ScopeLevelName> = {
    collection: 'collection',
    folder: 'folder',
    workspace: 'globals',
};

type FolderVariablesProps = {
    /**
     * The environment the app chose for what the folder sends, when it chooses apart from the
     * window: the connection in front, in Realtime. `null` is a choice of none, so the default of
     * the workspace rules; absent, the window's choice does.
     */
    environmentId?: string | null | undefined;
};

/**
 * The variables of a collection or a folder: a plain table — the file goes to git, so nothing in
 * it is secret — and, under it, what each row overrides or what overrides it, by name. It knows
 * its group by the tab it is drawn in, and composes the same scope a send of an item there does.
 */
export function FolderVariables({ environmentId }: FolderVariablesProps): ReactNode {
    const messages = useMessages('environment');
    const notifyFailure = useFailureToast();
    const { resource } = useTab();
    const place = folderOfResource(resource);
    const workspaceId = place?.workspaceId ?? null;
    const path = place?.path ?? null;
    const chain = useFolderChain(workspaceId, path);
    const environment = useStore(envStore, (state) => {
        if (workspaceId === null) {
            return undefined;
        }

        const id = rulingEnvironmentId(state, workspaceId, environmentId);

        return state.environments.find((each) => each.id === id);
    });
    const globals = useStore(envStore, (state) => state.globals);
    const own = chain[0];
    const variables = own?.settings.variables ?? [];
    const { adopt, lines } = useVariableLines(variables);
    const [columns, setColumns] = useState<KeyValueColumns>(COLUMNS);

    if (own === undefined || workspaceId === null || path === null) {
        return null;
    }

    const scope = windowScope(environment, globals, chain);
    const notes = variableNotes(
        {
            names: variables
                .filter((variable) => variable.enabled)
                .map((variable) => variable.name),
            scope,
            own: { level: SCOPE_LEVEL[own.level], label: own.name },
            environment,
        },
        messages,
    );

    const onLinesChange = (next: readonly KeyValueLine[]): void => {
        scheduleFolderVariablesWrite(workspaceId, path, adopt(next), notifyFailure);
    };

    return (
        <div
            className="grid min-h-0 content-start gap-gap-group p-pad-panel"
            data-part="folder-variables"
        >
            <KeyValueTable
                bulkEdit={false}
                columnMenu={false}
                columns={columns}
                environment={undefined}
                keyInvalid={blocksTheWrite}
                lines={lines}
                onColumnsChange={setColumns}
                onLinesChange={onLinesChange}
                onVariablesChange={() => undefined}
                title={messages('variables')}
                typed={false}
                variables={false}
            />
            <VariableNotes notes={notes} />
        </div>
    );
}

/** What each row overrides, or what overrides it; nothing when no row meets another level. */
function VariableNotes({ notes }: { notes: readonly VariableNote[] }) {
    const messages = useMessages('environment');

    if (notes.length === 0) {
        return null;
    }

    return (
        <ul
            className="flex flex-col gap-gap-tight text-xs text-text-secondary"
            data-part="folder-variable-notes"
        >
            {notes.map((note) => (
                <li key={note.name}>
                    {`{{${note.name}}}`} · {messages(note.kind, { levels: note.levels })}
                </li>
            ))}
        </ul>
    );
}
