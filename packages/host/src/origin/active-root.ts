import { success, type Result } from '@mandor/ipc';

import { activeRepo } from './active-repo.js';

/**
 * The directory of the active origin, or the refusal of a window that is between origins. Every
 * handler that touches disk starts here: main alone knows where the work lives, and a renderer
 * never sends a path.
 */
export function activeRoot(): Result<string> {
    const repo = activeRepo();

    if (!repo.ok) {
        return repo;
    }

    return success(repo.value.root);
}
