import type { Result } from '@mandor/ipc';

import { bridge } from '@mandor/shell';

/** Empties an origin: its workspaces go, the origin stays. The caller already confirmed by name. */
export function emptyOrigin(id: string): Promise<Result<object>> {
    return bridge.origin.empty({ id });
}
