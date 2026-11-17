import { useEffect } from 'react';

import { applyEditStep } from '@mandor/ui';

import { bridge } from '../bridge.js';

/**
 * Takes the steps of the history the Edit menu asks for. The menu lives in main and the history
 * lives here: the editor keeps its own, and the browser keeps one per field, so the window is
 * the only one that can tell which of the two the caret is sitting in.
 */
export function useMenuEditSteps(): void {
    useEffect(
        () =>
            bridge.menu.onEditStep((push) => {
                applyEditStep(push.step);
            }),
        [],
    );
}
