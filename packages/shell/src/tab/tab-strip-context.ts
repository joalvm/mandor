import { createContext } from 'react';

/** The strip an action is drawn in: the group a tab it adds is born into. */
export type TabStripContextValue = {
    groupId: string;
};

/** Given by the strip to every action it draws. */
export const TabStripContext = createContext<TabStripContextValue | null>(null);
