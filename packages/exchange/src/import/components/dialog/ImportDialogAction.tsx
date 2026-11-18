import type { InteropScope } from '@mandor/interop-core';
import { useState, type ComponentType, type PropsWithChildren } from 'react';

import type { ImportChoice } from '../../lib/import-choice.js';
import type { ImportedDocument } from '../../lib/imported-document.js';
import { ImportButtonDoor } from './ImportButtonDoor.js';
import { ImportDialog } from './ImportDialog.js';
import { ImportIconDoor } from './ImportIconDoor.js';

/**
 * The children are another way in the app offers, drawn above the dropzone while no document is
 * read: they reach the dialog with `useImportDialog`.
 */
type ImportDialogActionProps = PropsWithChildren<{
    /** The formats the app reads, each with the words the app shows for it. None, no button. */
    formats: readonly ImportChoice[];
    onImported: (imported: ImportedDocument) => void;
    /** What the import brings in, which also says how it is reached. */
    scope: InteropScope;
}>;

/** How each scope is reached: a collection by an icon in its section, the workspace by a button. */
const DOORS: Readonly<Record<InteropScope, ComponentType<{ onOpen: () => void }>>> = {
    collection: ImportIconDoor,
    workspace: ImportButtonDoor,
};

/** The door of an import and the import that opens on top of it. */
export function ImportDialogAction({
    children,
    formats,
    onImported,
    scope,
}: ImportDialogActionProps) {
    const Door = DOORS[scope];
    const [open, setOpen] = useState(false);

    if (formats.length === 0) {
        return null;
    }

    return (
        <>
            <Door
                onOpen={() => {
                    setOpen(true);
                }}
            />
            <OpenImport
                formats={formats}
                onClose={() => {
                    setOpen(false);
                }}
                onImported={onImported}
                open={open}
                scope={scope}
            >
                {children}
            </OpenImport>
        </>
    );
}

function OpenImport({
    children,
    formats,
    onClose,
    onImported,
    open,
    scope,
}: ImportDialogActionProps & { onClose: () => void; open: boolean }) {
    if (!open) {
        return null;
    }

    return (
        <ImportDialog formats={formats} onClose={onClose} onImported={onImported} scope={scope}>
            {children}
        </ImportDialog>
    );
}
