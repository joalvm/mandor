import { useTab } from '@mandor/shell';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';

import { requestsStore } from '../../requests-store.js';

/** The dot of an example whose edits are not on the file yet, at the end of its tab. */
export function ExampleDraftMark(): ReactNode {
    const { resource } = useTab();
    const draft = useStore(requestsStore, (state) => state.exampleDrafts[resource]);

    if (draft === undefined) {
        return null;
    }

    return <span className="size-1.5 rounded-full bg-text-accent" data-part="example-draft-mark" />;
}
