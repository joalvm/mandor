import { use } from 'react';

import { ImportDialogContext, type ImportDialogValue } from '../import-dialog-context.js';

/** The import a part is drawn in, read by the part instead of a prop handed down to it. */
export function useImportDialog(): ImportDialogValue {
    const dialog = use(ImportDialogContext);

    if (dialog === null) {
        throw new Error('useImportDialog is only read inside the import dialog.');
    }

    return dialog;
}
