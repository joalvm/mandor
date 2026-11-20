import { useMessages } from '@mandor/i18n';
import type { CollectionNode } from '@mandor/schema';
import { IconButton } from '@mandor/ui';

import { CollectionNodeMenu } from './CollectionNodeMenu.js';

type CollectionRowMenuProps = { node: CollectionNode; workspaceId: string };

/**
 * The menu of a row, behind its own button. The button is out of the order of the tab key: the
 * tree is one stop, and its keys reach the row. A click on it is the menu's and not the row's.
 */
export function CollectionRowMenu({ node, workspaceId }: CollectionRowMenuProps) {
    const messages = useMessages('collections');

    return (
        <span
            data-part="collection-row-menu"
            onClick={(event) => {
                event.stopPropagation();
            }}
            role="presentation"
        >
            <CollectionNodeMenu node={node} workspaceId={workspaceId}>
                <IconButton
                    icon="more-horizontal"
                    label={messages('rowOptions')}
                    size="sm"
                    tabIndex={-1}
                />
            </CollectionNodeMenu>
        </span>
    );
}
