import { useMessages } from '@mandor/i18n';

import { useShellStore } from '../../hooks/useShellStore.js';

/**
 * The window while the origin under it is being replaced. Two round trips to main pass with
 * the workspaces of one origin on screen and the session of another on its way, and every form
 * left reachable in that gap would write into the origin being left.
 */
export function OriginSwitching() {
    const messages = useMessages('shell');
    const switching = useShellStore((state) => state.switchingOrigin);

    if (!switching) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-dialog flex items-center justify-center bg-surface-overlay text-sm text-text-primary"
            data-part="origin-switching"
        >
            {messages('switchingOrigin')}
        </div>
    );
}
