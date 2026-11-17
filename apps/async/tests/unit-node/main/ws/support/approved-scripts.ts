import { createScriptVariables } from '@mandor/host';
import { startInProcessScriptWorker } from '@mandor/host/testing/script-worker';

import type { ConnectionScriptDeps } from '../../../../../src/main/ws/before-connect.js';

/**
 * Every script approved, the engine on the thread of the test, a direct network. The switch of
 * this machine is on unless `switchOn` says otherwise, read at each run.
 */
export function approvedScripts(
    lines: [string, string][] = [],
    switchOn: () => boolean = () => true,
): ConnectionScriptDeps {
    return {
        scripts: {
            startChain: startInProcessScriptWorker,
            approvals: {
                isApproved: () => Promise.resolve(true),
                approve: () => Promise.resolve(),
                forgetAll: () => Promise.resolve(),
            },
            scriptsSwitch: { enabled: switchOn, set: () => Promise.resolve() },
        },
        scriptVariables: createScriptVariables(),
        logger: {
            log: (level, message) => {
                lines.push([level, message]);
            },
        },
        networkFor: () => Promise.resolve({ tls: {} }),
    };
}
