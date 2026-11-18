import { createContext } from 'react';

/** The import a part of the app is drawn inside: what it can do to the dialog that holds it. */
export type ImportDialogValue = {
    /** Closes the import without bringing anything in: what the part did is its own answer. */
    close: () => void;
};

/** Given by the import dialog to what the app draws in it, above the document it asks for. */
export const ImportDialogContext = createContext<ImportDialogValue | null>(null);
