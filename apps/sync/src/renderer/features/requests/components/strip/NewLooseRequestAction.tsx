import { useMessages } from '@mandor/i18n';
import { useTabStrip } from '@mandor/shell';
import { IconButton } from '@mandor/ui';

import { openLooseRequest } from '../../lib/open-loose-request.js';

/**
 * The add at the end of every strip: a new request that belongs to no collection yet, opened in
 * the group of the strip that asked. It works at once; where it goes is asked when it is saved.
 */
export function NewLooseRequestAction() {
    const { groupId } = useTabStrip();
    const messages = useMessages('requests');

    return (
        <IconButton
            icon="add"
            label={messages('newRequest')}
            onClick={() => {
                openLooseRequest(groupId, messages('newRequest'));
            }}
        />
    );
}
