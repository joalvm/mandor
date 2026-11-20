import { useSyncExternalStore } from 'react';

import { scaleTokenValues } from '../styles/token-scale-values.js';

/** The line of the comfortable density, which is what the window reads before any sheet loads. */
const SCALE_ROW = Number.parseFloat(scaleTokenValues['mandor-height-row']);

/** The height last read, and the density it was read under: the sheet is asked once per change. */
let read: { density: string | undefined; height: number } | undefined;

function heightOnTheWindow(): number {
    const value = Number.parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--mandor-height-row'),
    );

    return Number.isFinite(value) && value > 0 ? value : SCALE_ROW;
}

function currentHeight(): number {
    const density = document.documentElement.dataset['density'];

    if (read === undefined || read.density !== density) {
        read = { density, height: heightOnTheWindow() };
    }

    return read.height;
}

function watchDensity(onChange: () => void): () => void {
    const observer = new MutationObserver(onChange);

    observer.observe(document.documentElement, {
        attributeFilter: ['data-density'],
        attributes: true,
    });

    return () => {
        observer.disconnect();
    };
}

/**
 * How tall a line of the scale stands on the window today. The density moves it, so a list that
 * lays its lines out from a number reads it here and not from the generated scale, which only
 * knows the comfortable one.
 */
export function useRowHeight(): number {
    return useSyncExternalStore(watchDensity, currentHeight, () => SCALE_ROW);
}
