import { createDeclarations } from '@mandor/shell';
import { createContext } from 'react';

/**
 * The sections the tab of a folder shows, declared in the tree of each app: an id and the words
 * its strip says, already in the language of whoever declares them. The order is the one they
 * arrive in. `collections` knows no feature: the bodies come from the app.
 */
export const folderSectionDeclarations = createDeclarations<
    { id: string; label: string },
    'body'
>();

/** The section a body is declared inside: a body anywhere else is a mistake of the tree. */
export const FolderSectionIdContext = createContext<string | null>(null);

/** The kind of tab of a collection or a folder. */
export const FOLDER_TAB_KIND = 'folder';
