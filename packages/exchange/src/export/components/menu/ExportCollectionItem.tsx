import { ExportIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import { MenuItem } from '@mandor/ui';

import { requestExport } from '../../lib/export-request.js';

type ExportCollectionItemProps = {
    /** The route of the collection the menu belongs to. */
    collection: string;
};

/** The line of the menu of a collection that takes it out: it rings, and the dialog opens. */
export function ExportCollectionItem({ collection }: ExportCollectionItemProps) {
    const messages = useMessages('export');

    return (
        <MenuItem
            onSelect={() => {
                requestExport({ collection });
            }}
        >
            <ExportIcon />
            {messages('collection')}
        </MenuItem>
    );
}
