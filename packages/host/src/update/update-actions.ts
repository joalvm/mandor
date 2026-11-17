import { failure, success, type Empty, type Result, type UpdateState } from '@mandor/ipc';

import { installNow } from './install-update.js';
import type { UpdatePort } from './update-port.js';

const EMPTY: Result<Empty> = success({});

export type UpdateActionsDeps = {
    port: UpdatePort;
    support: UpdateState['support'];
    homepage: string;
    openExternal: (url: string) => Promise<void>;
    settle: () => Promise<void>;
    /** The state main keeps now. */
    state: () => UpdateState;
    /** Marks that a person is waiting for the answer of what is about to run. */
    ask: () => void;
};

/** The four things a person can ask of the updates, whichever surface they ask from. */
export type UpdateActions = {
    check: () => Promise<Result<Empty>>;
    download: () => Promise<Result<Empty>>;
    install: () => Promise<Result<Empty>>;
    openPage: () => Promise<Result<Empty>>;
};

/**
 * What the window and the application menu both call: one body for each action, so the menu
 * can never do something the window may not.
 */
export function createUpdateActions(deps: UpdateActionsDeps): UpdateActions {
    const { port, support } = deps;

    return {
        check: async () => {
            if (support !== 'unsupported') {
                deps.ask();
                await port.checkForUpdates();
            }

            return EMPTY;
        },
        download: async () => {
            if (support === 'full') {
                deps.ask();
                await port.downloadUpdate();
            }

            return EMPTY;
        },
        install: async () => {
            if (support === 'full' && deps.state().phase === 'ready') {
                await installNow(port, deps.settle);
            }

            return EMPTY;
        },
        openPage: async () => {
            if (new URL(deps.homepage).protocol !== 'https:') {
                return failure('bad-request', 'the page of the app is not an https address');
            }

            await deps.openExternal(deps.homepage);

            return EMPTY;
        },
    };
}
