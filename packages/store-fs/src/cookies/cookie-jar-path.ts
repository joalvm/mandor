import { join } from 'node:path';

import { assertSegment } from '@mandor/schema';

import { mandorDir } from '../repo/repo-path.js';

const COOKIES_DIR = 'cookies';
/** The jar of a workspace with no environment. A slug never starts with an underscore, so no environment can take it. */
const NO_ENVIRONMENT = '_none';

/**
 * The file of the jar of one environment, inside `.mandor`: it never goes to git, because a
 * session cookie is as good as a password. Both ids pass the path-traversal gate; `null` is the
 * jar of the workspace without an environment.
 */
export function cookieJarFile(
    root: string,
    workspaceId: string,
    environmentId: string | null,
): string {
    if (environmentId !== null) {
        assertSegment(environmentId);
    }

    return join(cookieJarsDir(root, workspaceId), `${environmentId ?? NO_ENVIRONMENT}.json`);
}

/** The folder of the jars of one workspace: it goes when the workspace goes. */
export function cookieJarsDir(root: string, workspaceId: string): string {
    assertSegment(workspaceId);

    return join(mandorDir(root), COOKIES_DIR, workspaceId);
}
