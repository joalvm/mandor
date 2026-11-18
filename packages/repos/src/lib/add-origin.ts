import type { OriginAddRequest, Result } from '@mandor/ipc';
import type { Origin } from '@mandor/schema';

import { bridge } from '@mandor/shell';

/**
 * Asks main to record an origin. Main asks the address first: an origin that does not
 * answer comes back as a failure and is never stored in silence.
 */
export function addOrigin(input: OriginAddRequest): Promise<Result<Origin>> {
    return bridge.origin.add(input);
}
