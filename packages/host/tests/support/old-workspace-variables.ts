import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Variable } from '@mandor/schema';

/**
 * Writes the `variables` key an older build kept in `workspace.yaml`, the way a repo arrives from
 * a machine that never migrated: no writer of this build puts it there anymore. JSON is YAML, so
 * the list goes in as it is.
 */
export async function writeOldWorkspaceVariables(
    root: string,
    workspaceId: string,
    variables: readonly Variable[],
): Promise<void> {
    const file = join(root, 'workspaces', workspaceId, 'workspace.yaml');
    const text = await readFile(file, 'utf8');

    await writeFile(file, `${text}variables: ${JSON.stringify(variables)}\n`, 'utf8');
}
