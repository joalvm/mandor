import { useMessages } from '@mandor/i18n';
import { Card, IconButton, LogLines } from '@mandor/ui';
import { useMemo } from 'react';
import { useStore } from 'zustand';

import { consoleLinesOf } from '../../console/console-runs.js';
import { consoleStore } from '../../console/console-store.js';

const BAND =
    'flex h-header min-w-0 shrink-0 items-center gap-gap-control px-pad-panel text-xs font-semibold text-text-secondary';

/**
 * The console itself: every run that wrote something, oldest first, the newest at the bottom
 * where the eye looks for it. It is emptied by hand and put away by hand; nothing in it opens or
 * closes on its own. It is a card of its own under the work, apart from it by the gutter of the
 * frame and not by a line.
 */
export function ConsolePanel() {
    const messages = useMessages('shell');
    const runs = useStore(consoleStore, (state) => state.runs);
    const clear = useStore(consoleStore, (state) => state.clear);
    const hide = useStore(consoleStore, (state) => state.hide);
    const lines = useMemo(() => consoleLinesOf(runs), [runs]);

    return (
        <Card aria-label={messages('consoleTitle')}>
            <div className={BAND} data-part="console-header">
                <span className="min-w-0 truncate">{messages('consoleTitle')}</span>
                <div className="ml-auto flex shrink-0 items-center gap-gap-tight">
                    <IconButton
                        icon="delete"
                        iconSize="sm"
                        label={messages('consoleClear')}
                        onClick={clear}
                        size="xs"
                    />
                    <IconButton
                        icon="close"
                        iconSize="sm"
                        label={messages('consoleHide')}
                        onClick={hide}
                        size="xs"
                    />
                </div>
            </div>
            <div className="min-h-0 flex-1" data-part="console-lines">
                <LogLines
                    empty={messages('consoleEmpty')}
                    followsEnd
                    label={messages('consoleList')}
                    lines={lines}
                />
            </div>
        </Card>
    );
}
