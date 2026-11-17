import { useMessages } from '@mandor/i18n';
import { EmptyState } from '@mandor/ui';

/**
 * What a group of the window says while it holds no connection.
 *
 * A connection is made from its section of the lateral and picked from its rows, so the way out
 * is already on screen and this page does not repeat it as a button of its own.
 */
export function NoConnectionOpen() {
    const messages = useMessages('connections');

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-part="no-connection-open">
            <EmptyState
                description={messages('noConnectionOpenBody')}
                icon="connection"
                title={messages('noConnectionOpen')}
            />
        </div>
    );
}
