import { useSyncExternalStore } from 'react';

import { textZoom, watchTextZoom } from '../lib/text-zoom.js';

function subscribe(onChange: () => void): () => void {
    return watchTextZoom(onChange);
}

/** The step the text of the window is read at, and a new render each time the reader moves it. */
export function useTextZoom(): number {
    return useSyncExternalStore(subscribe, textZoom);
}
