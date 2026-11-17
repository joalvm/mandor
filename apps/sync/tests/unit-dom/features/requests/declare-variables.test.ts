import { itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { success } from '@mandor/ipc';
import { createEnvironment, formatResourceUri, type Variable } from '@mandor/schema';
import { bridge } from '@mandor/shell';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { declareVariables } from '../../../../src/renderer/features/requests/lib/declare-variables.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');
const APP_RESOURCE = formatResourceUri({ scope: 'app', name: 'welcome' });
const IN_FORCE = createEnvironment({ id: 'local', name: 'Local' });
const VARIABLES: Variable[] = [{ enabled: true, name: 'base', secret: false, value: '' }];

describe('declaring the variables a request names', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        envStore.getState().reset();
        vi.spyOn(bridge.environment, 'update').mockResolvedValue(success(IN_FORCE));
        vi.spyOn(bridge.environment, 'list').mockResolvedValue(success([IN_FORCE]));
    });

    it('leaves them in the environment in force, in the workspace the item lives in', async () => {
        await declareVariables(RESOURCE, IN_FORCE, VARIABLES);

        expect(bridge.environment.update).toHaveBeenCalledWith({
            changes: { variables: VARIABLES },
            environmentId: IN_FORCE.id,
            workspaceId: 'local',
        });
    });

    it('writes nothing when no environment is in force', async () => {
        await declareVariables(RESOURCE, undefined, VARIABLES);

        expect(bridge.environment.update).not.toHaveBeenCalled();
    });

    it('writes nothing for a resource that is no item of a workspace', async () => {
        await declareVariables(APP_RESOURCE, IN_FORCE, VARIABLES);

        expect(bridge.environment.update).not.toHaveBeenCalled();
    });
});
