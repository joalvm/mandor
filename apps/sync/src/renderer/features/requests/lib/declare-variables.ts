import { envStore } from '@mandor/env';
import type { Environment, Variable } from '@mandor/schema';

import { requestPartsOf } from './request-parts.js';

/**
 * Leaves the variables a field of the request hands over in the environment in force, the one of
 * the workspace the item lives in and the one a send resolves against. With no environment in
 * force there is nowhere to write, and the popover that offers the declaration says so instead.
 */
export async function declareVariables(
    resource: string,
    environment: Environment | undefined,
    variables: readonly Variable[],
): Promise<void> {
    const workspaceId = requestPartsOf(resource)?.workspaceId;

    if (workspaceId === undefined || environment === undefined) {
        return;
    }

    await envStore.getState().setVariables(workspaceId, environment.id, variables);
}
