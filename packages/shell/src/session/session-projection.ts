import type { UiSession } from '@mandor/ipc';

import type { ShellData } from '../shell-data.js';

/**
 * What the window writes down about itself. The grid goes as it is: the session file is the
 * same shape the store holds, so there is no second layout to keep in step with the first.
 */
export function sessionOf(state: ShellData): UiSession {
    return {
        version: 2,
        activeWorkspaceId: state.activeWorkspaceId,
        activeGroupId: state.activeGroupId,
        grid: state.grid,
        panels: { ...state.panels },
        tabState: { ...state.tabState },
        sections: { ...state.sections },
    };
}
