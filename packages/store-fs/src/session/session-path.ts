import { join } from 'node:path';

import { mandorDir } from '../repo/repo-path.js';

const SESSION_FILE = 'session.yaml';

/** Private renderer session for one repo. */
export function sessionFile(root: string): string {
    return join(mandorDir(root), SESSION_FILE);
}
