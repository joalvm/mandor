import { join } from 'node:path';

import { assertSegment } from '@mandor/schema';

import { workspaceDir } from '../workspace/workspace-path.js';

const ENVIRONMENTS_DIR = 'environments';

/** One environment, one file: a conflict stays inside the environment that was touched. */
export function environmentsDir(root: string, workspaceId: string): string {
    return join(workspaceDir(root, workspaceId), ENVIRONMENTS_DIR);
}

/** Path of one environment. Both ids are validated before they reach `join`. */
export function environmentFile(root: string, workspaceId: string, environmentId: string): string {
    assertSegment(environmentId);

    return join(environmentsDir(root, workspaceId), `${environmentId}.yaml`);
}
