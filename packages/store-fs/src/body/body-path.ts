import { join } from 'node:path';

import { mandorDir } from '../repo/repo-path.js';

const BODIES_DIR = 'bodies';
const SHA256_HEX = /^[a-f0-9]{64}$/;

/** Where the bodies of responses that did not fit in memory are kept, inside `.mandor`. */
export function bodiesDir(root: string): string {
    return join(mandorDir(root), BODIES_DIR);
}

/**
 * The file one body lives in, named by the sha-256 of its bytes in hex. A hash is the only name
 * accepted: anything else could carry a separator and walk out of the folder.
 */
export function bodyFile(root: string, sha256: string): string {
    if (!SHA256_HEX.test(sha256)) {
        throw new Error('A body is named by a sha-256 in lowercase hex');
    }

    return join(bodiesDir(root), sha256);
}
