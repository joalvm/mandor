/** The one environment variable of this file, named once. */
const EXTENSION_VARIABLE = 'MANDOR_REACT_DEVTOOLS';

export type ReactDevToolsDeps = {
    /** Loads an unpacked extension from a folder of this machine. */
    load: (path: string) => Promise<unknown>;
    environment: (name: string) => string | undefined;
    log: (message: string) => void;
};

/**
 * Loads the React DevTools extension in development, when the developer has one on this
 * machine and has said where with `MANDOR_REACT_DEVTOOLS`. Nothing is ever downloaded: the
 * variable points at a folder already there. A failure is written down and the app carries
 * on — an extension of tools must never be the reason the tools refuse to start.
 */
export async function installReactDevTools(deps: ReactDevToolsDeps): Promise<void> {
    const path = deps.environment(EXTENSION_VARIABLE);

    if (path === undefined) {
        return;
    }

    try {
        await deps.load(path);
    } catch (error) {
        deps.log(`the React DevTools extension at ${path} could not load: ${String(error)}`);
    }
}
