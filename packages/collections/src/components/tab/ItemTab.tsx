import { useMessages } from '@mandor/i18n';
import { Card, EmptyState } from '@mandor/ui';

import { useTabItem } from '../../hooks/useTabItem.js';
import { ItemProvider } from '../../item-context.js';

/**
 * One item, drawn by whoever declared its kind. A kind this window never declared is a page
 * saying so: Sync lists and moves the messages of a workspace long before it can open one, and
 * a tree that threw on the first click would be worse than a tree that admits what it is.
 *
 * The tab lays no card of its own: each kind draws its body on the cards it needs, and the page
 * of an unknown kind rests on one.
 */
export function ItemTab() {
    const messages = useMessages('collections');
    const { item, leaf, name, resource } = useTabItem();

    if (leaf === undefined) {
        return (
            <div className="flex h-full min-h-0 flex-1 flex-col" data-part="item-tab">
                <Card>
                    <EmptyState
                        description={messages('unknownItem', { kind: item?.itemKind ?? '' })}
                        icon="file"
                        title={name ?? ''}
                    />
                </Card>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col" data-part="item-tab">
            <ItemProvider value={{ resource, saved: item?.mark }}>{leaf.body}</ItemProvider>
        </div>
    );
}
