import { nodeAt } from '@mandor/collections';
import { type CollectionNode, parseResourceUri } from '@mandor/schema';

/**
 * What to call the event a composer is holding. The collection owns the name and the composer only
 * remembers where the event lives, because a name copied the day the event was opened is the
 * name it had that day: rename it and the two start saying different things about one file.
 *
 * The path cannot answer this on its own — a segment is the slug of a name, not the name — so
 * the tree is asked, and until the tree lands the name it was opened under is the best there is.
 */
export function composerEventName(
    resource: string,
    opened: string,
    nodes: readonly CollectionNode[],
): string {
    if (resource === '') {
        return opened;
    }

    const parts = parseResourceUri(resource);

    if (parts.scope !== 'workspace') {
        return opened;
    }

    return nodeAt(nodes, parts.path)?.name ?? opened;
}
