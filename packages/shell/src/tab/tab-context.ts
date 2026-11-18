import { createContext } from 'react';

import type { Tab } from './tab.js';

/** The tab a drawn part belongs to: the body, the mark and the status of one tab read it. */
export type TabContextValue = {
    resource: Tab['resource'];
    tabId: string;
};

/** Given by whoever draws a part of a kind: the group, the strip, a test. */
export const TabProvider = createContext<TabContextValue | null>(null);

/** The id of the kind whose parts are being declared, given by `TabKind` to its parts. */
export const TabKindIdContext = createContext<string | null>(null);
