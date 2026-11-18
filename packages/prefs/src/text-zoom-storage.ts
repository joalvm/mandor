/**
 * The step the reader left the text of the window at. It is kept apart from the settings of the
 * dialog: nobody picks it from a list, it moves under the wheel.
 */
const TEXT_ZOOM_STORAGE_KEY = 'mandor.textZoom';

/** The step kept, or the size of the app when none was kept or what was kept is not a step. */
export function readTextZoom(): number {
    const stored = Number(window.localStorage.getItem(TEXT_ZOOM_STORAGE_KEY));

    return Number.isInteger(stored) ? stored : 0;
}

export function writeTextZoom(level: number): void {
    window.localStorage.setItem(TEXT_ZOOM_STORAGE_KEY, String(level));
}
