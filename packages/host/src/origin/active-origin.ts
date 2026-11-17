import type { StoredOrigin } from './stored-origin.js';

/**
 * The origin the window is working in. Main alone knows it: the renderer only ever sees ids,
 * and every handler resolves the id against this before touching the disk.
 */
let active: StoredOrigin | null = null;

export function setActiveOrigin(origin: StoredOrigin | null): void {
    active = origin;
}

/** The directory of the active origin, or nothing while the window is between origins. */
export function activeOriginRoot(): string | null {
    return active?.root ?? null;
}

/**
 * The whole active origin, for a handler that needs more of it than its directory. The id is
 * one of the four parts a secret is named by, and only main knows which origin is open.
 */
export function activeOrigin(): StoredOrigin | null {
    return active;
}
