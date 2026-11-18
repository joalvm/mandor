import { useMessages } from '@mandor/i18n';
import { fireAndForget, useFailureToast, useUnfoldSection } from '@mandor/shell';
import { IconButton } from '@mandor/ui';

import { useWorkspaceScope } from '../../hooks/useWorkspaceScope.js';
import { startConnection } from '../../lib/start-connection.js';

/**
 * Starts one connection from the header of the section, where it is there whether or not the
 * workspace holds any: the one place a connection is made. It opens in the group the window has
 * in front, and its row is left naming it. A folded section opens first, so the row being named
 * is there to see.
 */
export function NewConnectionEntry() {
    const messages = useMessages('connections');
    const notifyFailure = useFailureToast();
    const scope = useWorkspaceScope();
    const unfold = useUnfoldSection();

    return (
        <IconButton
            disabled={scope === null}
            disabledReason={messages('newConnection')}
            icon="add"
            label={messages('newConnection')}
            onClick={() => {
                unfold();
                fireAndForget(
                    startConnection({
                        name: messages('newConnection'),
                        notify: (code) => {
                            notifyFailure(code);
                        },
                        scope,
                    }),
                );
            }}
            size="sm"
        />
    );
}
