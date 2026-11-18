import { editor } from 'monaco-editor/editor/editor.api.js';

type Fonts = Pick<FontFaceSet, 'addEventListener'>;

/**
 * Monaco measures the type of the window at the first editor and keeps the reading. The editor
 * loads once the code type is in, so the first reading is right; a face that lands later — another
 * weight, a file that took its time — would leave every caret of the window off the letters it
 * sits between, falling further behind each column. Each time faces land, every editor measures
 * again. Asking the window whether a face is in does not work: `check` says yes for a font of the
 * same name installed on the machine, while the window draws the one it is still loading.
 */
export function remeasureOnEachFontArrival(fonts: Fonts, remeasure: () => void): void {
    fonts.addEventListener('loadingdone', () => {
        remeasure();
    });
}

let listening = false;

/** Asked by every editor that mounts; the window listens for its faces once. */
export function measureCodeTypeOnArrival(): void {
    if (listening) {
        return;
    }

    listening = true;
    remeasureOnEachFontArrival(document.fonts, () => {
        editor.remeasureFonts();
    });
}
