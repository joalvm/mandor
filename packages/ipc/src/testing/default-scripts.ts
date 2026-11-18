import type { ScriptsArea } from '../bridge/scripts-area.js';
import { success } from '../result/success.js';

/** The scripts area a test gets when it says nothing about scripts: nothing approved, switch on. */
export function defaultScripts(): ScriptsArea {
    return {
        approve: () => Promise.resolve(success({ approved: false })),
        status: (request) =>
            Promise.resolve(
                success({ statuses: request.scripts.map(() => 'unapproved' as const) }),
            ),
        forget: () => Promise.resolve(success({})),
        readSwitch: () => Promise.resolve(success({ enabled: true })),
        writeSwitch: () => Promise.resolve(success({})),
        clearVariables: () => Promise.resolve(success({})),
    };
}
