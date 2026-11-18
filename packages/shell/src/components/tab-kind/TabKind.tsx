import { useLayoutEffect, type PropsWithChildren } from 'react';

import { TabKindIdContext } from '../../tab/tab-context.js';
import { declareTabKind, type TabKindLogic } from '../../tab/tab-kind-registry.js';

/** The children are `TabBody`, `TabIndicator` and `TabStatus`: what every tab of the kind shows. */
type TabKindProps = PropsWithChildren<TabKindLogic>;

/**
 * One kind of tab, declared where the app is written down: what it decides as props, what it
 * shows as children. Nothing is drawn here — the group and the strip draw the parts, each inside
 * the tab it belongs to.
 *
 * The declaration runs in a layout effect, so it is in place before the session, loaded in a
 * passive effect, restores a tab of the kind. It is declared again on every draw of the app
 * tree, which is rare, so a prop never goes stale.
 */
export function TabKind({ children, ...logic }: TabKindProps) {
    useLayoutEffect(() => declareTabKind(logic));

    return <TabKindIdContext value={logic.id}>{children}</TabKindIdContext>;
}
