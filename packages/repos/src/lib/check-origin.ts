import type { OriginCheck, Result } from '@mandor/ipc';

import { bridge } from '@mandor/shell';

/**
 * Asks main whether an origin answers. A refusal to answer is an answer — `reachable: false` —
 * and paints the row; only a request that cannot be asked is a failure of the channel.
 */
export function checkOrigin(id: string): Promise<Result<OriginCheck>> {
    return bridge.origin.check({ id });
}
