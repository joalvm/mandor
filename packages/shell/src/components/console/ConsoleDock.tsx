import { useMessages } from '@mandor/i18n';
import { SplitHalf, SplitPane } from '@mandor/ui';
import type { PropsWithChildren } from 'react';
import { useStore } from 'zustand';

import { consoleStore } from '../../console/console-store.js';
import { useSplit } from '../../hooks/useSplit.js';
import { ConsolePanel } from './ConsolePanel.js';

/** Where the line between the work and the console starts, as a share of the centre's height. */
const CONSOLE_SPLIT = 70;

/**
 * The centre of the window with the console under it, as an editor keeps its panel under the
 * files: hidden until it is asked for, and then as tall as the reader left it. What the centre
 * holds stays where it is in the tree while the console comes and goes, so nothing in it is
 * drawn anew.
 */
export function ConsoleDock({ children }: PropsWithChildren) {
    const messages = useMessages('shell');
    const open = useStore(consoleStore, (state) => state.open);
    const [split, setSplit] = useSplit('console', CONSOLE_SPLIT);

    return (
        <SplitPane
            className="flex-1"
            collapsed={!open}
            direction="column"
            initial={CONSOLE_SPLIT}
            label={messages('consoleResize')}
            max={85}
            min={30}
            onValueChange={setSplit}
            value={split}
        >
            <SplitHalf className="flex">{children}</SplitHalf>
            <ConsoleHalf open={open} />
        </SplitPane>
    );
}

/** The console takes its half only while it is out: a hidden one draws nothing at all. */
function ConsoleHalf({ open }: { open: boolean }) {
    if (!open) {
        return null;
    }

    return (
        <SplitHalf>
            <ConsolePanel />
        </SplitHalf>
    );
}
