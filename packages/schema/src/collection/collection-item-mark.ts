import { REQUEST_ITEM_KIND } from '../request/request-item-kind.js';
import { METHOD_PATTERN } from '../request/request-methods.js';
import type { CollectionItem } from './collection-item.js';

/**
 * The short word an item wears beside its name in the tree, read off its body by its kind: the
 * method of a request. The tree carries it so a row can say it without opening the file; a kind
 * that wears none, or a body that does not say a valid one, leaves it out.
 */
export function collectionItemMark(item: CollectionItem): string | undefined {
    const method = item.kind === REQUEST_ITEM_KIND ? item.body['method'] : undefined;

    return typeof method === 'string' && METHOD_PATTERN.test(method) ? method : undefined;
}
