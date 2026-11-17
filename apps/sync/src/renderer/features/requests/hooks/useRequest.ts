import { useItemFromDisk } from '@mandor/collections';
import type { RequestItem } from '@mandor/schema';
import { useStore } from 'zustand';

import { loadRequest } from '../lib/load-request.js';
import { reloadRequest } from '../lib/reload-request.js';
import { requestsStore } from '../requests-store.js';

/**
 * The item behind one resource, read the first time somebody looks at it. Two tabs of the same
 * item share the entry, so what one of them saves the other one sees. The file changing on
 * disk without the window reads it again.
 */
export function useRequest(resource: string): RequestItem | undefined {
    useItemFromDisk(resource, { load: loadRequest, reload: reloadRequest });

    return useStore(requestsStore, (state) => state.requests[resource]);
}
