import type { SearchHit } from './search-workspace.js';

export type SearchSlice = {
    /** The hits the body of the bar lists: memory matches first, content matches under them. */
    hits: SearchHit[];
};

export function initialSearchSlice(): SearchSlice {
    return { hits: [] };
}
