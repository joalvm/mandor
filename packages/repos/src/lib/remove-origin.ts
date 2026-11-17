import type { Empty, Result } from '@mandor/ipc';

import { bridge } from '@mandor/shell';

/**
 * Takes an origin off the list and its copy off this machine. The caller already confirmed by
 * name, and decides where the window works next if what left was the one in use.
 */
export function removeOrigin(id: string): Promise<Result<Empty>> {
    return bridge.origin.remove({ id });
}
