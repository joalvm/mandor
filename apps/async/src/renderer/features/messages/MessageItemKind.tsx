import { ItemBody, ItemKind } from '@mandor/collections';
import { MessageIcon } from '@mandor/icons';
import { MESSAGE_ITEM_KIND } from '@mandor/schema';
import { Card } from '@mandor/ui';

import { openEventInComposer } from '../../events/open-event-in-composer.js';
import { messagesStore } from './messages-store.js';
import { MessagePanel } from './components/panel/MessagePanel.js';

/**
 * What Async knows that the collection does not: an item of kind message is drawn by this feature.
 * The package never names the kind, so Sync declares its own and neither sees the other.
 * Choosing an event lands it in the composer of the connection the user works in, and only
 * when no connection is open does it fall through to a tab of its own.
 */
export function MessageItemKind() {
    return (
        <ItemKind
            component={MessageIcon}
            kind={MESSAGE_ITEM_KIND}
            newLabel="messages:newMessage"
            open={openEventInComposer}
            release={(resource) => {
                messagesStore.getState().forget(resource);
            }}
        >
            <ItemBody>
                <Card>
                    <MessagePanel />
                </Card>
            </ItemBody>
        </ItemKind>
    );
}
