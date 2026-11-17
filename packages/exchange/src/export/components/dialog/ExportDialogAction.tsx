import type { InteropScope } from '@mandor/interop-core';
import { fireAndForget } from '@mandor/shell';
import { useState, type ComponentType, type ReactNode } from 'react';

import { useExportFlow, type ExportFlow } from '../../hooks/useExportFlow.js';
import { ExportButtonDoor } from './ExportButtonDoor.js';
import { ExportDialog } from './ExportDialog.js';
import type { ExportChoices } from './ExportFormatMenu.js';
import { ExportRequestDoor } from './ExportRequestDoor.js';

type ExportDialogActionProps = {
    /** The formats the app writes, each with the words the app shows for it. */
    formats: ExportChoices;
    /** What the export covers, which also says how it is reached. */
    scope: InteropScope;
};

/** How each scope is reached: the workspace has a button, a collection has the line of its menu. */
const DOORS: Readonly<
    Record<InteropScope, ComponentType<{ onOpen: (collection?: string) => void }>>
> = {
    collection: ExportRequestDoor,
    workspace: ExportButtonDoor,
};

/**
 * The door of an export and the export that opens on it. The dialog and the flow are shared; the
 * formats and the words about them are the app's.
 */
export function ExportDialogAction({ formats, scope }: ExportDialogActionProps): ReactNode {
    const Door = DOORS[scope];
    const [open, setOpen] = useState(false);
    const close = (): void => {
        setOpen(false);
    };

    const flow = useExportFlow(close, { formats, scope });

    const show = (collection?: string): void => {
        setOpen(true);
        fireAndForget(flow.load(collection));
    };

    return (
        <>
            <Door onOpen={show} />
            <OpenExport flow={flow} formats={formats} onClose={close} open={open} />
        </>
    );
}

function OpenExport({
    flow,
    formats,
    onClose,
    open,
}: {
    flow: ExportFlow;
    formats: ExportDialogActionProps['formats'];
    onClose: () => void;
    open: boolean;
}) {
    if (!open) {
        return null;
    }

    return <ExportDialog flow={flow} formats={formats} onClose={onClose} />;
}
