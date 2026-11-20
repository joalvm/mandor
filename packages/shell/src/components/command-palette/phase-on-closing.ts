/** Open, fading out after it was closed, or gone. */
export type PalettePhase = 'closing' | 'gone' | 'open';

/**
 * What a closed palette turns into: where the sheet animates its box there is a fade to wait
 * for, and it lingers until the fade ends; where it does not, it goes at once.
 */
export function phaseOnClosing(box: HTMLElement | null): PalettePhase {
    const name = box === null ? '' : getComputedStyle(box).animationName;

    return name === '' || name === 'none' ? 'gone' : 'closing';
}
