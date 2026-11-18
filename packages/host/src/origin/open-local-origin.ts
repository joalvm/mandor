import { createPlainI18n, type Language } from '@mandor/i18n';
import { createLocalOrigin, type WorkspaceKind } from '@mandor/schema';

import type { Logger } from '../log/create-logger.js';
import { defaultRepoRoot } from '../repo/default-repo-root.js';
import { ensureLocalRepo } from '../repo/ensure-local-repo.js';
import { setActiveOrigin } from './active-origin.js';
import { openOriginRuntime } from './origin-runtime.js';
import { rememberOrigin } from './origins.js';

/**
 * The name of the one origin that exists from the first start. It is a proper name, not a
 * label: the interface shows it as it is, the way it shows the name of a workspace.
 */
const LOCAL_ORIGIN_NAME = 'Local';

/**
 * The origin the window opens into, ready before the window exists: the renderer asks for it
 * as soon as it mounts, and an origin that arrives afterwards shows as an app with nothing in
 * it.
 *
 * `Local` is the ground the app stands on: it exists from the first start, whether or not the
 * user ever asked for it, and it is registered on every boot. `ensureLocalRepo` is idempotent,
 * so a machine that already has it is read, never rewritten. The names it writes the first
 * time are in the language main speaks then, the one the menu speaks.
 */
export async function openLocalOrigin(
    kind: WorkspaceKind,
    userDataDir: string,
    logger: Logger,
    language: Language,
): Promise<void> {
    const root = defaultRepoRoot(kind);
    const messages = createPlainI18n(language);

    try {
        await ensureLocalRepo({
            name: messages.t('origins:defaultName'),
            workspaceName: messages.t('workspace:defaultName'),
            kind,
            root,
        });

        const local = { ...createLocalOrigin(LOCAL_ORIGIN_NAME), root };

        await rememberOrigin(userDataDir, local);
        setActiveOrigin(local);
        openOriginRuntime(local, logger);
    } catch (error) {
        // Starting with no origin still leaves an app the user can work in once one is added.
        // Refusing to start leaves them nothing at all.
        logger.log('error', `the local origin at ${root} could not be opened: ${String(error)}`);
    }
}
