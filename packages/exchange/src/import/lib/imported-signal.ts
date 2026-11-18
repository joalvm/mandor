import { createDoorbell } from '@mandor/ui';

/**
 * One doorbell for the surfaces that hold what an import touches. It rings after an import
 * lands, and the app root hands it to whoever reads again: no feature names another, and the
 * ones that do not care hear nothing.
 */
const IMPORTED = createDoorbell<null>();

/** Rings once an import landed on disk. */
export function notifyImported(): void {
    IMPORTED.ring(null);
}

/** Listens for a landed import and returns its way out. */
export function onImported(handler: () => void): () => void {
    return IMPORTED.listen(handler);
}
