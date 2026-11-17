import type { OriginRenameRequest, Result } from '@mandor/ipc';
import type { Origin } from '@mandor/schema';

import { bridge } from '@mandor/shell';

/** The name moves; the id, the kind and the directory stay as they are. */
export function renameOrigin(request: OriginRenameRequest): Promise<Result<Origin>> {
    return bridge.origin.rename(request);
}
