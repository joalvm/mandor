import { loadedSchemaChecker, loadSchemaChecker, onSchemaCheckerLoaded } from '@mandor/validate';
import { useEffect, useSyncExternalStore } from 'react';

function checkerLoaded(): boolean {
    return loadedSchemaChecker() !== null;
}

/**
 * Whether the schema checker has loaded. A verdict drawn before it is none yet, so a component
 * that draws one reads this beside its schema and draws again when the checker arrives. Asking
 * for it loads it.
 */
export function useSchemaChecker(): boolean {
    const loaded = useSyncExternalStore(onSchemaCheckerLoaded, checkerLoaded);

    // A checker that fails to load is a fault of the build, not of the schema: it is told where
    // every uncaught fault of the window is, and the verdict stays unsaid rather than wrong.
    useEffect(() => {
        void loadSchemaChecker().catch((error: unknown) => {
            reportError(error);
        });
    }, []);

    return loaded;
}
