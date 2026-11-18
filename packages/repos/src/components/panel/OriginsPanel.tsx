import { AddIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import type { Origin } from '@mandor/schema';
import {
    fireAndForget,
    selectConflicts,
    shellStore,
    syncNoticeOf,
    useShellStore,
} from '@mandor/shell';
import { Button } from '@mandor/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

import { checkOrigin } from '../../lib/check-origin.js';
import type { OriginCheckState } from '../../lib/origin-health.js';
import { listOrigins } from '../../lib/list-origins.js';
import { useOriginActions } from '../../hooks/useOriginActions.js';
import { AddOriginDialog } from '../dialog/AddOriginDialog.js';
import { EmptyOriginDialog } from '../dialog/EmptyOriginDialog.js';
import { RemoveOriginDialog } from '../dialog/RemoveOriginDialog.js';
import { ConflictList } from './ConflictList.js';
import { OriginTable } from './OriginTable.js';

type OriginsPanelProps = {
    /** Switching has an order only the app knows, so the panel asks the app to run it. */
    onSwitch: (id: string) => void;
};

/**
 * The management page of the origins: a title that says where the work lives, the action that
 * adds one under it, and the table below — every remote origin asked once as the page opens.
 * All inside the reading width of the app, like every page of the window. Main owns the list;
 * the panel only asks.
 */
export function OriginsPanel({ onSwitch }: OriginsPanelProps) {
    const messages = useMessages('origins');
    const origins = useShellStore((state) => state.origins);
    const activeOriginId = useShellStore((state) => state.activeOriginId);
    const conflicts = useShellStore(selectConflicts);
    const notice = useShellStore((state) => syncNoticeOf(state.syncState));
    const [checks, setChecks] = useState<Record<string, OriginCheckState>>({});
    // Each remote origin is asked once as it appears; asking again is a menu action, not a habit.
    const asked = useRef<Set<string>>(new Set());

    const check = useCallback((origin: Origin): void => {
        if (origin.kind === 'local') {
            return;
        }

        setChecks((before) => ({ ...before, [origin.id]: 'checking' }));
        fireAndForget(
            checkOrigin(origin.id).then((result) => {
                if (result.ok) {
                    setChecks((before) => ({ ...before, [origin.id]: result.value.reachable }));
                }
            }),
        );
    }, []);

    const refresh = useCallback((): void => {
        fireAndForget(
            listOrigins().then((result) => {
                if (result.ok) {
                    shellStore.getState().setOrigins(result.value);
                    result.value.forEach((origin) => {
                        if (origin.kind !== 'local' && !asked.current.has(origin.id)) {
                            asked.current.add(origin.id);
                            check(origin);
                        }
                    });
                }
            }),
        );
    }, [check]);

    useEffect(refresh, [refresh]);

    const { actions, adding, emptying, removing, renamingId } = useOriginActions({
        activeOriginId,
        onSwitch,
        refresh,
    });

    return (
        <section
            aria-labelledby="origins-heading"
            className="flex h-full min-h-0 min-w-0 flex-col"
            data-part="origins-panel"
        >
            <div
                className="mx-auto flex h-full w-full max-w-2xl flex-col gap-gap-section overflow-y-auto p-pad-panel pt-gap-section"
                data-part="origin-list"
            >
                <header className="flex flex-col gap-gap-control">
                    <h1 className="text-lg font-semibold text-text-primary" id="origins-heading">
                        {messages('heading')}
                    </h1>
                    <p className="text-sm text-text-secondary">{messages('subtitle')}</p>
                </header>
                <div className="flex items-center gap-gap-control" data-part="origin-actions">
                    <Button
                        className="gap-gap-control"
                        onClick={() => {
                            actions.openAdd();
                        }}
                        size="sm"
                        variant="secondary"
                    >
                        <AddIcon size="sm" />
                        {messages('addAction')}
                    </Button>
                </div>
                <ConflictList conflicts={conflicts} />
                <OriginTable
                    activeOriginId={activeOriginId}
                    checks={checks}
                    notice={notice}
                    onCheck={check}
                    onEmpty={actions.askEmpty}
                    onRemove={actions.askRemove}
                    onRenameCancel={actions.cancelRename}
                    onRenameCommit={actions.rename}
                    onRenameRequest={actions.askRename}
                    origins={origins}
                    renamingId={renamingId}
                />
            </div>
            <AddOrigin adding={adding} onAdded={refresh} onClose={actions.closeAdd} />
            <EmptyOriginDialog
                onCancel={actions.cancelEmpty}
                onConfirm={actions.confirmEmpty}
                origin={emptying}
            />
            <RemoveOriginDialog
                onCancel={actions.cancelRemove}
                onConfirm={actions.confirmRemove}
                origin={removing}
            />
        </section>
    );
}

function AddOrigin({
    adding,
    onAdded,
    onClose,
}: {
    adding: boolean;
    onAdded: () => void;
    onClose: () => void;
}) {
    if (!adding) {
        return null;
    }

    return <AddOriginDialog onAdded={onAdded} onClose={onClose} />;
}
