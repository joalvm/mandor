import type { Result } from '@mandor/ipc';
import type { Origin } from '@mandor/schema';

import { bridge } from '@mandor/shell';

/** The origins this machine knows. Main writes the list, never the renderer. */
export function listOrigins(): Promise<Result<Origin[]>> {
    return bridge.origin.list();
}
