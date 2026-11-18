import { useItemName } from '@mandor/collections';

import { useRequestTrail } from './useRequestTrail.js';

/** Where a request stands and what it is called now: the name follows every rename. */
export function useRequestPlace(resource: string): { name: string | null; trail: string[] } {
    return { name: useItemName(resource), trail: useRequestTrail(resource) };
}
