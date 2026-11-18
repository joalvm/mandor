import { shellStore } from './shell-store.js';

/**
 * What the active origin is called. A resource URI is written with it, so the same file reads
 * the same in every window, and every feature of the app has to spell it the one way.
 */
export function originName(): string {
    const state = shellStore.getState();

    return (
        state.origins.find((origin) => origin.id === state.activeOriginId)?.name ??
        state.activeOriginId ??
        'local'
    );
}
