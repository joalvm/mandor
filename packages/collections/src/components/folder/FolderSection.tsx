import { useLayoutEffect, type PropsWithChildren } from 'react';

import {
    folderSectionDeclarations,
    FolderSectionIdContext,
} from '../../folder-section-declarations.js';

type FolderSectionProps = PropsWithChildren<{ id: string; label: string }>;

/**
 * One section of the tab of a folder, declared where the app writes its tree: its id, the words
 * of its strip, and — inside — the body it draws.
 */
export function FolderSection({ children, id, label }: FolderSectionProps) {
    useLayoutEffect(() => folderSectionDeclarations.declare({ id, label }));

    return <FolderSectionIdContext value={id}>{children}</FolderSectionIdContext>;
}
