import { exampleResource, useCollectionRow } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import { SendIcon } from '@mandor/icons';
import { originName } from '@mandor/shell';
import { MenuItem } from '@mandor/ui';

import { openExampleAsRequest } from '../../lib/open-example-as-request.js';

/** The line of the menu of an example that opens it as a request of its own. */
export function ExampleRowActions() {
    const labels = useMessages('requests');
    const { example, node, workspaceId } = useCollectionRow();

    if (example === undefined || node.kind !== 'item') {
        return null;
    }

    const resource = exampleResource(originName(), workspaceId, node.path, example.key);

    return (
        <MenuItem
            onSelect={() => {
                openExampleAsRequest(resource);
            }}
        >
            <SendIcon />
            {labels('openAsRequest')}
        </MenuItem>
    );
}
