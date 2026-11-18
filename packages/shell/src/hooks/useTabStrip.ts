import { use } from 'react';

import { TabStripContext, type TabStripContextValue } from '../tab/tab-strip-context.js';

/** The strip an action sits in, read by the action instead of a prop through a function. */
export function useTabStrip(): TabStripContextValue {
    const strip = use(TabStripContext);

    if (strip === null) {
        throw new Error('useTabStrip is only read inside an action of a strip of tabs.');
    }

    return strip;
}
