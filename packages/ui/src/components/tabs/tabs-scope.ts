import { createContext, useContext } from 'react';

type TabsScopeValue = {
    /** Opens a section, as the holder of the strip would on a click. */
    choose: (value: string) => void;
    open: string;
};

/**
 * Which section of a strip is open, and how to open another. A panel needs the first and the
 * menu of the sections out of view the second; neither means anything outside the strip that
 * provides it, and both die with that strip: a context, not a store.
 *
 * Radix keeps the same value in a context of its own, but it does not hand it out, and a panel
 * that stays mounted has to know whether to show itself.
 */
const TabsScope = createContext<TabsScopeValue | null>(null);

export const TabsScopeProvider = TabsScope.Provider;

function useTabsScope(): TabsScopeValue {
    const scope = useContext(TabsScope);

    if (scope === null) {
        throw new Error('A section panel was drawn outside the strip it belongs to.');
    }

    return scope;
}

/** The section that is open, for a panel that is asking whether it is the one. */
export function useOpenSection(): string {
    return useTabsScope().open;
}

/** Opens a section of the strip from outside its list, like the menu of those out of view. */
export function useChooseSection(): (value: string) => void {
    return useTabsScope().choose;
}
