import { useItem } from '@mandor/collections';
import { MethodMark } from '@mandor/ui';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';

import { requestsStore } from '../../requests-store.js';

/**
 * The method of a request in its hue, where the row and the tab of the item would wear a glyph.
 * What the window holds goes first — the draft, then what it read — so a method changed in the
 * bar shows in the tree before it is saved; a request never opened says what the file says —
 * the mark the tree read off it.
 */
export function RequestMethodMark(): ReactNode {
    const { resource, saved } = useItem();
    const method = useStore(
        requestsStore,
        (state) =>
            state.pendings[resource]?.request.method ?? state.requests[resource]?.method ?? saved,
    );

    return <MethodMark compact method={method ?? 'GET'} />;
}
