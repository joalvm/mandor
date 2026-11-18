import type { PropsWithChildren } from 'react';

import { useDeclaration } from '../../declare/useDeclaration.js';
import { tabStripActionDeclarations } from '../../tab/tab-strip-action-registry.js';

/** The children read the strip they are drawn in with `useTabStrip`. */
type TabStripActionProps = PropsWithChildren<{ id: string }>;

/**
 * Declares an action every strip of the window offers — the add of connections, say — while it
 * is mounted. The action is not tied to the tabs the strip holds, so a strip with no tabs left
 * keeps offering it: a strip is where a new tab is born, and it says so even when it is empty.
 */
export function TabStripAction({ children, id }: TabStripActionProps) {
    useDeclaration(tabStripActionDeclarations, { id }, 'content', children);

    return null;
}
