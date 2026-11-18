import { useItem } from '@mandor/collections';
import { useStore } from 'zustand';
import type { ReactNode } from 'react';

import { requestHasDraft } from '../../lib/request-example-drafts.js';
import { requestsStore } from '../../requests-store.js';

/**
 * The dot of a draft nobody saved yet, at the end of the tab of the request. Sync keeps the
 * draft in the window and puts it on disk when the person says so, and until then the tab says
 * there is more in the window than in the file: the schema of an example typed on the answer
 * counts too.
 */
export function RequestDraftMark(): ReactNode {
    const { resource } = useItem();
    const drafted = useStore(requestsStore, (state) => requestHasDraft(state, resource));

    if (!drafted) {
        return null;
    }

    return <span className="size-1.5 rounded-full bg-text-accent" data-part="request-draft-mark" />;
}
