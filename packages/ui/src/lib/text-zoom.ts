/**
 * How far the reader moved the size of the text the window is read in, the editors and the pages
 * of the docs, in steps of a tenth of the size the app draws it at. There is one size for the
 * whole window: whoever enlarges one document to read it wants to read the next one at that size.
 */
const SMALLEST = -2;

const LARGEST = 10;

const state = { level: 0 };

const listeners = new Set<(level: number) => void>();

/** The step the text is drawn at: 0 is the size of the app. */
export function textZoom(): number {
    return state.level;
}

/** Puts the text at one step, within the steps there are, and tells whoever is watching. */
export function setTextZoom(level: number): void {
    const next = Math.min(LARGEST, Math.max(SMALLEST, Math.round(level)));

    if (next === state.level) {
        return;
    }

    state.level = next;
    listeners.forEach((listener) => {
        listener(next);
    });
}

/** Moves the text some steps up, or down for a negative count. */
export function zoomTextBy(steps: number): void {
    setTextZoom(state.level + steps);
}

/** Tells the step each time it changes, and hands back the way to stop listening. */
export function watchTextZoom(listener: (level: number) => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/** A size of the app at the step the text is drawn at: a tenth larger for each step up. */
export function zoomedTextSize(size: number): number {
    return (size * (10 + state.level)) / 10;
}
