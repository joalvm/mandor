import { createContext } from 'react';

/**
 * The folder the item on screen hangs from, for every field below it: its variables resolve
 * with that chain. Whoever shows an item mounts it — a request of the collection, a composer
 * holding an item — and nothing else does: a loose request or a connection lives in no folder.
 * `null` is the same as no item.
 */
export const ItemPlaceContext = createContext<string | null>(null);
