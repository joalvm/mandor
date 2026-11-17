import { useMessages } from '@mandor/i18n';
import { EmptyState } from '@mandor/ui';

/**
 * What a group of the Sync window says while it holds no tab.
 *
 * Sync opens whatever the tree of the workspace offers, so the page names the lateral rather
 * than one kind of item: a page that said «request» would be wrong the day a spec opens here.
 */
export function NoTabOpen() {
    const messages = useMessages('sync');

    return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-part="no-tab-open">
            <EmptyState
                description={messages('noTabOpenBody')}
                icon="doc"
                title={messages('noTabOpen')}
            />
        </div>
    );
}
