import type { Workspace } from './workspace.js';

/**
 * The environment that rules a send or a field: the one chosen — by this machine in Request, by
 * the connection in Realtime — and, with none chosen, the default of the workspace. Main and the
 * window ask this the same way, so what is painted is what goes out.
 */
export function effectiveEnvironment(
    chosen: string | null,
    workspace: Pick<Workspace, 'defaultEnvironment'> | null,
): string | null {
    return chosen ?? workspace?.defaultEnvironment ?? null;
}
