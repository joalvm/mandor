import { effectiveEnvironment } from '@mandor/schema';

import type { EnvSlice } from '../env.slice.js';

/**
 * The environment that rules what a folder sends, as main picks it. `chosen` is the app's own
 * choice when it makes one apart from the window — the connection in front, in Realtime — and
 * `null` there means that choice names none, so the default of the workspace rules. Without one
 * the window's choice stands in.
 */
export function rulingEnvironmentId(
    state: Pick<EnvSlice, 'activeEnvironmentIds' | 'defaultEnvironmentIds'>,
    workspaceId: string,
    chosen: string | null | undefined,
): string | null {
    const picked =
        chosen === undefined ? (state.activeEnvironmentIds[workspaceId] ?? null) : chosen;

    return effectiveEnvironment(picked, {
        defaultEnvironment: state.defaultEnvironmentIds[workspaceId],
    });
}
