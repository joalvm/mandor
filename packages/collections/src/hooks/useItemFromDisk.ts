import type { ErrorCode } from '@mandor/ipc';
import { fireAndForget, useFailureToast, useRepoChanged } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';

import { itemPartsOf } from '../lib/item-resource.js';

type ItemFromDisk = {
    /** Brings the item off disk once; the code of the fault when it could not. */
    load: (resource: string) => Promise<ErrorCode | null>;
    /** Reads the item again, because its file changed under the window. */
    reload: (resource: string) => Promise<unknown>;
};

/**
 * Keeps one item in step with its file: read the first time somebody looks at it, a fault told
 * as a toast, and read again when the file changes on disk without the window. Where the item
 * lives once it is read is the caller's business.
 */
export function useItemFromDisk(resource: string, { load, reload }: ItemFromDisk): void {
    const notifyFailure = useFailureToast();
    // The item is read once per resource; a caller that hands in a new `load` asks for nothing.
    const loadOnce = useEffectEvent((): void => {
        fireAndForget(
            load(resource).then((code) => {
                if (code !== null) {
                    notifyFailure(code);
                }
            }),
        );
    });

    useEffect(() => {
        loadOnce();
    }, [resource]);

    useRepoChanged(
        (entity) => {
            const parts = itemPartsOf(resource);

            return (
                parts !== null &&
                entity.area === 'collections' &&
                entity.workspaceId === parts.workspaceId &&
                entity.path === parts.path
            );
        },
        () => {
            fireAndForget(reload(resource));
        },
    );
}
