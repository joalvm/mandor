import { createScriptVariables } from '@mandor/host';
import { startInProcessScriptWorker } from '@mandor/host/testing/script-worker';

import type { SendScripts } from '../../../../../src/main/request/request-scripts.js';

/** Every script approved, the switch on, and the real engine on the thread of the test. */
export function approvedScripts(): Pick<SendScripts, 'scripts' | 'scriptVariables'> {
    return {
        scripts: {
            startChain: (options) => startInProcessScriptWorker(options),
            approvals: {
                isApproved: () => Promise.resolve(true),
                approve: () => Promise.resolve(),
                forgetAll: () => Promise.resolve(),
            },
            scriptsSwitch: { enabled: () => true, set: () => Promise.resolve() },
        },
        scriptVariables: createScriptVariables(),
    };
}
