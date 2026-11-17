import { createWorkspace, slugify } from '@mandor/schema';

import type { CoreBridge } from '../bridge/core-bridge.js';
import { success } from '../result/success.js';

/** The workspace area a test gets when it says nothing about it: valid data, no variables. */
export function defaultWorkspace(): CoreBridge['workspace'] {
    return {
        create: (input) =>
            Promise.resolve(
                success(
                    createWorkspace({ id: slugify(input.name), name: input.name, kind: 'async' }),
                ),
            ),
        delete: () => Promise.resolve(success({})),
        list: () => Promise.resolve(success([])),
        rename: (input) =>
            Promise.resolve(success({ id: input.id, kind: 'async', name: input.name })),
    };
}
