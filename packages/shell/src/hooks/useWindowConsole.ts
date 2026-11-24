import { useMessages } from '@mandor/i18n';
import { useEffect, useEffectEvent } from 'react';

import { consoleStore, writeConsole } from '../console/console-store.js';
import { onWindowConsole, type WindowLine } from '../console/window-console.js';

/**
 * Writes to the console what the window itself says: every notice it shows and every fault it
 * takes, as a browser keeps the warnings and errors of its page. Lines in a row share one run
 * under the name of the window; a run of anything else between them starts a new one. Mounted
 * once by each app.
 */
export function useWindowConsole(): void {
    const messages = useMessages('shell');
    const titleOf = useEffectEvent(() => messages('consoleWindowTitle'));

    useEffect(() => {
        let current = '';
        let written = 0;

        return onWindowConsole((line: WindowLine) => {
            written += 1;

            if (consoleStore.getState().runs.at(-1)?.id !== current) {
                current = `window/${String(written)}`;
            }

            writeConsole({ id: current, title: titleOf() }, [{ key: String(written), ...line }]);
        });
    }, []);
}
