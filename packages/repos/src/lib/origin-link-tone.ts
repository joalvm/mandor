import type { Origin, OriginSyncState, OriginSyncStateName } from '@mandor/schema';

/**
 * Whether a remote origin is reached: only a failed synchronization says it is not. A conflict or
 * a remote ahead of the copy is work to do, and the line of status says so; the link holds.
 */
const LINK_TONE: Readonly<Record<OriginSyncStateName, 'error' | 'success'>> = {
    'local-only': 'success',
    clean: 'success',
    ahead: 'success',
    behind: 'success',
    diverged: 'success',
    conflict: 'success',
    error: 'error',
};

/** The local origin reaches nothing, and a remote one not yet heard from says nothing yet. */
export function originLinkTone(
    origin: Origin,
    syncState: OriginSyncState | null,
): 'error' | 'success' | undefined {
    if (origin.kind === 'local' || syncState === null) {
        return undefined;
    }

    return LINK_TONE[syncState.state];
}
