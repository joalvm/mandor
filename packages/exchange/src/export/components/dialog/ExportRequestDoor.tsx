import { useEffect, type ReactNode } from 'react';

import { onExportRequested } from '../../lib/export-request.js';

type ExportRequestDoorProps = {
    onOpen: (collection?: string) => void;
};

/**
 * The door of a collection: it has no button of its own, because the line of the menu of the
 * collection is the button. It waits for that line to ring and opens the export on its collection.
 */
export function ExportRequestDoor({ onOpen }: ExportRequestDoorProps): ReactNode {
    useEffect(
        () =>
            onExportRequested(({ collection }) => {
                onOpen(collection);
            }),
        [onOpen],
    );

    return null;
}
