import { useMessages } from '@mandor/i18n';
import { EmptyState } from '@mandor/ui';

/**
 * What the half of the event shows while the connection holds none.
 *
 * A composer with nothing to compose reads as a failure; a line saying what is missing reads as
 * what it is, and the collection on the lateral is already the way out of it. The activity
 * beside it stays: it belongs to the connection, not to the event.
 */
export function NoEventOpen() {
    const messages = useMessages('connections');

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="no-event-open">
            <EmptyState
                description={messages('noEventOpenBody')}
                icon="message"
                title={messages('noEventOpen')}
            />
        </div>
    );
}
