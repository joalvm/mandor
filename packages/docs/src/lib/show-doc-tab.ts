import { shellStore } from '@mandor/shell';

import type { DocTabAt } from './doc-tab-in.js';

/**
 * Brings a tab that is already open forward. The group takes the focus along with it: the tab
 * the reader asked for sitting behind another one, in a half of the window nobody is looking
 * at, reads as an app that did nothing.
 */
export function showDocTab(at: DocTabAt): void {
    const shell = shellStore.getState();

    shell.setActiveTab(at.groupId, at.tabId);
    shell.focusGroup(at.groupId);
}
