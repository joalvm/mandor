import { ItemActionsMenu } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import type { ResourceUri } from '@mandor/schema';
import { IconButton } from '@mandor/ui';

type RequestActionsProps = {
    /**
     * Keeps the answer of the last send as an example of the request. Undefined while there is
     * no answer to keep: the icon is not drawn then.
     */
    onKeep: (() => void) | undefined;
    onOpenCode: () => void;
    resource: ResourceUri;
};

/**
 * What is done with the request as a whole, at the end of the row of its trail: its code,
 * keeping the answer of the last send once there is one, and the menu of its row in the tree.
 */
export function RequestActions({ onKeep, onOpenCode, resource }: RequestActionsProps) {
    const labels = useMessages('requests');

    return (
        <>
            <IconButton icon="code" label={labels('code')} onClick={onOpenCode} size="sm" />
            <SaveResponseButton onKeep={onKeep} />
            <ItemActionsMenu resource={resource} />
        </>
    );
}

function SaveResponseButton({ onKeep }: Pick<RequestActionsProps, 'onKeep'>) {
    const labels = useMessages('requests');

    if (onKeep === undefined) {
        return null;
    }

    return <IconButton icon="save" label={labels('saveResponse')} onClick={onKeep} size="sm" />;
}
