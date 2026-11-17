import { loadSchemaChecker } from '@mandor/validate';

import { loadEditorRuntime } from './editor-runtime.js';

/** How long the window may stay busy before the editor is warmed anyway. */
const AT_THE_LATEST = 2000;

/**
 * The first document the user opens would wait for the editor to load, start and measure its
 * type, and the first schema it checks against would wait for the checker. A window asks for
 * this at its start, and pays all of that the first moment it has nothing else to do, out of
 * sight, instead.
 */
export function warmEditorWhenIdle(): void {
    requestIdleCallback(
        () => {
            loadEditorRuntime()
                .then((runtime) => {
                    runtime.warmEditor();
                })
                .catch((error: unknown) => {
                    reportError(error);
                });
            loadSchemaChecker().catch((error: unknown) => {
                reportError(error);
            });
        },
        { timeout: AT_THE_LATEST },
    );
}
