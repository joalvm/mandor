import { envStore } from '@mandor/env';
import type { Environment } from '@mandor/schema';
import { useStore } from 'zustand';

import { requestPartsOf } from '../lib/request-parts.js';

/**
 * The environment a send of this request resolves against: the active one of the workspace the
 * request lives in, saved or not, which is where main looks too. Reading the workspace the
 * window shows would paint one thing and send another the day a tab of another workspace is open.
 */
export function useRequestEnvironment(resource: string): Environment | undefined {
    const workspaceId = requestPartsOf(resource)?.workspaceId;
    // With none chosen on this machine, the default of the workspace rules, as it does in main.
    const activeId = useStore(envStore, (state) =>
        workspaceId === undefined
            ? undefined
            : (state.activeEnvironmentIds[workspaceId] ?? state.defaultEnvironmentIds[workspaceId]),
    );
    const environments = useStore(envStore, (state) => state.environments);

    return environments.find((each) => each.id === activeId);
}
