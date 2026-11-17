import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { stringify } from 'yaml';

import { atomicWrite } from '../disk/atomic-write.js';
import { inTurn } from '../disk/in-turn.js';
import { sessionFile } from './session-path.js';

/**
 * Writes validated renderer state atomically under the repo-private directory. The window sends
 * a save without waiting for the one before, so each takes its turn: a big session sent first
 * would otherwise take longer to write and land after the newer one.
 */
export function writeSession(root: string, session: unknown): Promise<void> {
    const path = sessionFile(root);
    const contents = stringify(session, { lineWidth: 0 });

    return inTurn(path, async () => {
        await mkdir(dirname(path), { recursive: true });
        await atomicWrite(path, contents);
    });
}
