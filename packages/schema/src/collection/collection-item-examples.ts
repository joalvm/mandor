import { keyExamples } from '../request/example-keys.js';
import { REQUEST_ITEM_KIND } from '../request/request-item-kind.js';
import type { CollectionItem } from './collection-item.js';
import type { CollectionItemExample } from './collection-node.js';

const STATUS_MARK = /^([1-5]\d\d|default)$/;

type Entry = { name: string; mark: string | undefined };

function entryOf(value: unknown): Entry | null {
    const record = typeof value === 'object' && value !== null ? value : {};
    const name: unknown = Reflect.get(record, 'name');
    const status: unknown = Reflect.get(record, 'status');
    const mark = typeof status === 'string' && STATUS_MARK.test(status) ? status : undefined;

    return typeof name === 'string' ? { name, mark } : null;
}

function exampleOf(entry: Entry, key: string): CollectionItemExample {
    return { key, name: entry.name, ...(entry.mark === undefined ? {} : { mark: entry.mark }) };
}

/**
 * The examples an item lists under it in the tree, read off its body by its kind: those of a
 * request. The tree carries them so a row can show them without opening the file; a kind that
 * has none, or a body without any, leaves the whole list out.
 */
export function collectionItemExamples(item: CollectionItem): CollectionItemExample[] | undefined {
    const raw: unknown = item.kind === REQUEST_ITEM_KIND ? item.body['examples'] : undefined;
    const entries = Array.isArray(raw) ? raw.map(entryOf).filter((entry) => entry !== null) : [];
    const examples = keyExamples(entries).map(({ example, key }) => exampleOf(example, key));

    return examples.length === 0 ? undefined : examples;
}
