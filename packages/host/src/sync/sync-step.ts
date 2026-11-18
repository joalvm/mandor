import {
    aheadBehind,
    commitMessage,
    fastForward,
    fetchRemote,
    type NetworkAccess,
    pushBranch,
    restorePrivate,
    setPrivateAside,
    status,
    untrackPrivate,
} from '@mandor/git';
import type { OriginSyncStateName } from '@mandor/schema';
import { inTurn } from '@mandor/store-fs';

import type { StoredOrigin } from '../origin/stored-origin.js';
import { flushCommits } from '../repo/commit-scheduler.js';
import { mergeDivergence, type MergeDivergenceDeps } from './merge-divergence.js';

/** What a step needs from the outside, so a test can run it without a window or a keychain. */
export type SyncStepDeps = {
    access: () => Promise<NetworkAccess>;
    /** Whether a clash waits for a person: while one does, nothing is merged or sent. */
    hasConflicts: () => Promise<boolean>;
    /** The paths a move forward changed: the window must be told, and must not take them as foreign. */
    followed: (paths: string[]) => Promise<void>;
    /** What a merge of a divergence needs: the window to tell, and the log to leave a trace in. */
    mergeDeps: MergeDivergenceDeps;
    /**
     * Brings the origin to the current format after changes arrived: a machine that never
     * migrated can bring the old key back. It takes the turn of the repo itself.
     */
    migrate: () => Promise<void>;
};

/**
 * One step of the synchronization of an origin, and the state it ends in. What the window
 * committed goes first, so what is sent is whole; then the remote is asked what it has.
 * A clash kept for a person stops everything: nothing is brought or sent over it. The remote
 * ahead of this copy is taken when the tree is clean, and so is a remote that diverged: it is
 * merged, and the merge is sent unless it left a clash for a person. This copy only ahead is
 * sent. A failure of git is thrown: the loop that called decides when to try again.
 */
export async function syncStep(
    origin: Pick<StoredOrigin, 'name' | 'root' | 'kind'>,
    deps: SyncStepDeps,
): Promise<OriginSyncStateName> {
    if (origin.kind === 'local') {
        return 'local-only';
    }

    const { root } = origin;
    const access = await deps.access();

    await flushCommits(root);
    await fetchRemote(root, access);

    if (await deps.hasConflicts()) {
        return 'conflict';
    }

    const { ahead, behind } = await aheadBehind(root);

    if (behind > 0) {
        const state = await reconcile(origin, access, deps);

        if (state === 'clean') {
            await deps.migrate();
        }

        return state;
    }

    if (ahead > 0) {
        await pushBranch(root, access);
    }

    return 'clean';
}

/**
 * The branch moves forward or, when both sides hold something the other lacks, the two are
 * merged. Answers whether a clash waits for a person, and whether a merge waits to be sent.
 */
async function move(
    origin: Pick<StoredOrigin, 'name' | 'root'>,
    ahead: number,
    deps: SyncStepDeps,
): Promise<{ clash: boolean; send: boolean }> {
    if (ahead === 0) {
        await deps.followed(await fastForward(origin.root));

        return { clash: false, send: false };
    }

    const clash = (await mergeDivergence(origin, deps.mergeDeps)).records > 0;

    return { clash, send: !clash };
}

/**
 * Brings the remote in the turn of the repo, so no write of the window is half way through the
 * tree. A tree with something pending waits: a move or a merge would lay files over it. A merge
 * that left nothing to answer is sent, one that did stays here.
 *
 * The private directory is this machine's session, and a commit of the remote that carries it
 * would write over it or delete it: what this machine holds there is put back after the move,
 * failed or not, and the private files leave the branch in a commit that is sent with the rest.
 */
function reconcile(
    origin: Pick<StoredOrigin, 'name' | 'root'>,
    access: NetworkAccess,
    deps: SyncStepDeps,
): Promise<OriginSyncStateName> {
    const { root } = origin;

    return inTurn(root, async () => {
        const { ahead } = await aheadBehind(root);

        if (!(await status(root)).clean) {
            return ahead > 0 ? 'diverged' : 'behind';
        }

        const aside = await setPrivateAside(root);
        const moved = await move(origin, ahead, deps).finally(() => restorePrivate(root, aside));
        const untracked = await untrackPrivate(root, commitMessage({ kind: 'untrack-private' }));

        if (moved.clash) {
            return 'conflict';
        }

        if (moved.send || untracked) {
            await pushBranch(root, access);
        }

        return 'clean';
    });
}
