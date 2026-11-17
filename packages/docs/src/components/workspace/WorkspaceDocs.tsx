import { fireAndForget, useFailureToast, useRepoChanged, useShellStore } from '@mandor/shell';
import { useEffect, useEffectEvent, useRef } from 'react';
import { useStore } from 'zustand';

import { docsStore } from '../../docs-store.js';
import { docNameOf, docWorkspaceOf } from '../../lib/doc-resource.js';
import { loadDocs } from '../../lib/load-docs.js';
import { reloadDocText } from '../../lib/reload-doc-text.js';
import { DOCS_SECTION_ID } from '../sidebar/DocsSection.js';

/**
 * The notes of the open workspace, read when the workspace opens and again each time its section
 * unfolds. It draws nothing.
 *
 * The read does not belong to the section: a folded section unmounts its body, and a body that
 * read on mount emptied the list on each unfold until the answer came back. The list stays as it
 * was until the new one replaces it, and only a change of workspace empties it.
 *
 * A note that changed on disk without the window is read again where it is open, and the list is
 * read again for the one that appeared or went away.
 *
 * It is also the voice of what a write to `docs/` was refused with. A row that was renamed from
 * a section the reader then folded still has to be able to say it was not renamed.
 */
export function WorkspaceDocs(): null {
    const notifyFailure = useEffectEvent(useFailureToast());
    const workspaceId = useShellStore((state) => state.activeWorkspaceId);
    const unfolded = useShellStore(
        (state) => !state.panels.collapsedSections.includes(DOCS_SECTION_ID),
    );
    const error = useStore(docsStore, (state) => state.error);
    const listed = useRef<string | null | undefined>(undefined);

    useEffect(() => {
        let active = true;
        const moved = listed.current !== workspaceId;

        listed.current = workspaceId;

        if (moved) {
            docsStore.getState().forgetDocs();
        }

        if (workspaceId !== null && (moved || unfolded)) {
            fireAndForget(
                loadDocs(workspaceId).then((result) => {
                    if (active && !result.ok) {
                        notifyFailure(result.error.code);
                    }
                }),
            );
        }

        return () => {
            active = false;
        };
    }, [workspaceId, unfolded]);

    useRepoChanged(
        (entity) => entity.area === 'doc' && entity.workspaceId === workspaceId,
        (changes) => {
            if (workspaceId === null) {
                return;
            }

            fireAndForget(loadDocs(workspaceId));

            for (const resource of Object.keys(docsStore.getState().texts)) {
                const reread = changes.some(
                    (entity) =>
                        entity.area === 'doc' &&
                        entity.name === docNameOf(resource) &&
                        entity.workspaceId === docWorkspaceOf(resource),
                );

                if (reread) {
                    fireAndForget(reloadDocText(resource));
                }
            }
        },
    );

    useEffect(() => {
        if (error === null) {
            return;
        }

        notifyFailure(error);
        docsStore.getState().setError(null);
    }, [error]);

    return null;
}
