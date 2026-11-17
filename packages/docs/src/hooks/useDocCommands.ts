import { useFailureToast } from '@mandor/shell';
import { useEffect, useEffectEvent } from 'react';

import { registerDocCommands } from '../register-doc-commands.js';

/**
 * Hangs the commands of a doc off the window that draws the notices they may need. A command
 * runs outside React, and the toast lives inside it, so the tree is what closes the gap.
 */
export function useDocCommands(): void {
    const notifyFailure = useEffectEvent(useFailureToast());

    useEffect(
        () =>
            registerDocCommands((code) => {
                notifyFailure(code);
            }),
        [],
    );
}
