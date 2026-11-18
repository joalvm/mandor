import type { UpdateSupport } from '@mandor/ipc';

import type { Logger } from '../log/create-logger.js';
import { createElectronUpdaterPort } from './electron-updater-port.js';
import { installOnQuit } from './install-update.js';
import type { UpdateHandlerDeps } from './update.handlers.js';
import { inertUpdatePort, type UpdatePort } from './update-port.js';
import { scheduleChecks, systemTimers } from './update-schedule.js';
import { updateSupport, type UpdateSupportInput } from './update-support.js';

export type UpdateDepsInput = UpdateSupportInput & {
    homepage: string;
    logger: Logger;
    openExternal: (url: string) => Promise<void>;
    settle: () => Promise<void>;
    version: string;
};

/** An install the library cannot serve gets the inert port, so the library is never loaded. */
function portFor(support: UpdateSupport, input: UpdateDepsInput): UpdatePort {
    if (support === 'unsupported') {
        return inertUpdatePort(input.version);
    }

    return createElectronUpdaterPort(input.logger, input.version);
}

/**
 * What the update handlers stand on: what this install can do, the port that does it, and the
 * page where a person takes a version by hand. An install the library cannot serve gets the
 * inert port, so the library is never loaded for it.
 */
export function createUpdateDeps(input: UpdateDepsInput): Pick<
    UpdateHandlerDeps,
    'homepage' | 'openExternal' | 'port' | 'schedule' | 'settle' | 'support'
> & {
    installOnQuit: () => void;
} {
    const support = updateSupport(input);
    const port = portFor(support, input);

    return {
        port,
        support,
        homepage: input.homepage,
        openExternal: input.openExternal,
        settle: input.settle,
        schedule: scheduleChecks({ port, support, timers: systemTimers }),
        installOnQuit: () => {
            installOnQuit(port);
        },
    };
}
