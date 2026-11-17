import { StatusItem } from '@mandor/shell';
import { useEffect } from 'react';

import { UpdateStatus } from './components/status/UpdateStatus.js';
import { startUpdateSync } from './start-update-sync.js';

/**
 * Everything the window says about the updates, while it is mounted: it listens to main and
 * hangs the status on the line. The rest of the surface is the application menu, which main
 * owns.
 */
export function UpdatesStatus() {
    useEffect(() => startUpdateSync(), []);

    return (
        <StatusItem id="update" order={20}>
            <UpdateStatus />
        </StatusItem>
    );
}
