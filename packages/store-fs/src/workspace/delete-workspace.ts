import { rm } from 'node:fs/promises';

import { parseRepo, type Workspace } from '@mandor/schema';

import { cookieJarsDir } from '../cookies/cookie-jar-path.js';
import { graphqlSchemaDir } from '../graphql/graphql-schema-path.js';
import { readOrThrow } from '../disk/read-or-throw.js';
import { writeDocument } from '../disk/write-document.js';
import { historyDir } from '../history/history-path.js';
import { repoFile } from '../repo/repo-path.js';
import { readWorkspace } from './read-workspace.js';
import { workspaceDir } from './workspace-path.js';

/**
 * Removes one workspace and its contents from the origin, and answers with what left: the
 * directory goes, and the order kept in the repo file forgets the id so a later listing does
 * not miss it. The cookie jars of its environments, the schemas its requests read and the
 * history of its sends go with it. Reading first is what makes the answer the workspace that was, not its id.
 */
export async function deleteWorkspace(
    root: string,
    workspaceId: string,
): Promise<Workspace | null> {
    const repo = await readOrThrow(repoFile(root), parseRepo);
    const read = await readWorkspace(root, workspaceId);

    await rm(workspaceDir(root, workspaceId), { recursive: true, force: true });
    await rm(cookieJarsDir(root, workspaceId), { recursive: true, force: true });
    await rm(graphqlSchemaDir(root, workspaceId), { recursive: true, force: true });
    await rm(historyDir(root, workspaceId), { recursive: true, force: true });
    await writeDocument(repoFile(root), repo.document, {
        workspaces: repo.value.workspaces.filter((id) => id !== workspaceId),
    });

    return read.ok ? read.value : null;
}
