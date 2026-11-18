import { useDeclared } from '../declare/useDeclared.js';
import { tabKindDeclarations, type TabKindSpec } from '../tab/tab-kind-registry.js';

/**
 * The kind a drawn tab belongs to, read again whenever it is declared anew: a part that arrives
 * after the tab is on screen draws without anyone moving the tab.
 *
 * A kind can leave while its tabs are still drawn — the app tree going away, a module replaced
 * while developing — so there may be nothing to answer, and whoever draws draws nothing then.
 * A kind missing when the session is restored never gets here: the restore drops its tabs.
 */
export function useTabKind(id: string): TabKindSpec | undefined {
    return useDeclared(tabKindDeclarations, id);
}
