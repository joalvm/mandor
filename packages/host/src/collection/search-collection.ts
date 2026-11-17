import { collectionSearchRequestSchema } from '@mandor/ipc';

import { activeRepo } from '../origin/active-repo.js';
import { searchWorkspaceContent } from './search-workspace-content.js';

let activeSearch: AbortController | null = null;

/**
 * Answers one search of a workspace. A search that arrives while another still runs replaces it:
 * the answer the user waits for is the one to the last thing they typed.
 */
export async function searchCollection(raw: unknown) {
    const request = collectionSearchRequestSchema.safeParse(raw);
    const repo = activeRepo();

    if (!request.success) {
        return {
            ok: false as const,
            error: { code: 'bad-request' as const, message: request.error.message },
        };
    }

    if (!repo.ok) {
        return repo;
    }

    activeSearch?.abort();
    const controller = new AbortController();

    activeSearch = controller;

    try {
        const value = await searchWorkspaceContent(repo.value.root, {
            repo: repo.value.id,
            workspaceId: request.data.workspaceId,
            query: request.data.query,
            signal: controller.signal,
        });

        return { ok: true as const, value };
    } catch (error) {
        if (controller.signal.aborted) {
            return { ok: true as const, value: [] };
        }

        return { ok: false as const, error: { code: 'fs-read' as const, message: String(error) } };
    }
}
