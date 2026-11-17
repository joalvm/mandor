import type { ShellStore } from '../shell-store.js';

/**
 * A place of the window a command can send the reader to, without the shell learning what the
 * place is made of. Settings are a dialog, activity is a panel, and the shell has to know neither.
 *
 * It is the declaration of a `TabKind` applied one level up: the shell declares that the
 * window can be sent somewhere, and whoever builds that somewhere says how.
 */
export type WindowSurface = { id: string; open: (state: ShellStore) => void };

const SURFACES = new Map<string, WindowSurface>();

/** Declares who answers for a surface of the window and returns its matching cleanup. */
export function registerSurface(surface: WindowSurface): () => void {
    SURFACES.set(surface.id, surface);

    return () => {
        if (SURFACES.get(surface.id) === surface) {
            SURFACES.delete(surface.id);
        }
    };
}

/** The surface, or nothing while nobody has built it yet. */
export function windowSurface(id: string): WindowSurface | undefined {
    return SURFACES.get(id);
}
