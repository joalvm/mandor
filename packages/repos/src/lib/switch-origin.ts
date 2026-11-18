import type { OpenedOrigin, Result } from '@mandor/ipc';

import { bridge } from '@mandor/shell';

/** Makes an origin the one the window works in. The caller decides what to do with what it holds. */
export function switchOrigin(id: string): Promise<Result<OpenedOrigin>> {
    return bridge.origin.switch({ id });
}
