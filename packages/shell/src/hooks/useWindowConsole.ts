import { useMessages } from '@mandor/i18n';
import { useEffect, useEffectEvent } from 'react';

import { consoleWritesOf } from '../console/console-entries.js';
import { writeConsole } from '../console/console-store.js';
import { onWindowConsole, type WindowLine } from '../console/window-console.js';

/**
 * Writes to the console what the window itself says: every notice it shows and every fault it
 * takes, as a browser keeps the warnings and errors of its page, each one saying it came from the
 * window. Mounted once by each app.
 */
export function useWindowConsole(): void {
    const messages = useMessages('shell');
    const write = useEffectEvent((line: WindowLine) => {
        writeConsole(consoleWritesOf([line], messages('consoleWindowTitle')));
    });

    useEffect(() => onWindowConsole(write), []);
}
