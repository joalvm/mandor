import { useDeclaredPart } from '@mandor/shell';
import type { PropsWithChildren } from 'react';

import {
    folderSectionDeclarations,
    FolderSectionIdContext,
} from '../../folder-section-declarations.js';

/** What a section of the tab of a folder draws. It names its section by where it is written. */
export function FolderSectionBody({ children }: PropsWithChildren) {
    useDeclaredPart(
        {
            declarations: folderSectionDeclarations,
            misplaced: 'A folder section body is declared inside a FolderSection.',
            owner: FolderSectionIdContext,
            part: 'body',
        },
        children,
    );

    return null;
}
