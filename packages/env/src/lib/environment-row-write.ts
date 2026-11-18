import type { Environment } from '@mandor/schema';

import { GLOBALS_ROW } from './globals-row.js';
import { scheduleGlobalsWrite } from './pending-globals-write.js';
import { scheduleValidEnvironmentWrite } from './pending-environment-write.js';

/**
 * Writes what a row of the environments dialog holds where it lives: the globals as the one list
 * of the origin, an environment as a file of its workspace. Both wait for the typing to calm.
 */
export function scheduleRowWrite(workspaceId: string, next: Environment): void {
    if (next.id === GLOBALS_ROW) {
        scheduleGlobalsWrite(next.variables);

        return;
    }

    scheduleValidEnvironmentWrite(workspaceId, next);
}
