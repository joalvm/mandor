import { useMessages } from '@mandor/i18n';
import { Card, ConsoleEntries, IconButton, SearchInput, Select } from '@mandor/ui';
import { useMemo, useState } from 'react';
import { useStore } from 'zustand';

import { visibleEntries, type ConsoleLevelFilter } from '../../console/console-filter.js';
import { consoleSettingsStore, setConsoleSettings } from '../../console/console-settings.js';
import { consoleStore } from '../../console/console-store.js';
import { ConsoleSettingsMenu } from './ConsoleSettingsMenu.js';

const BAND = 'flex h-header min-w-0 shrink-0 items-center gap-gap-control px-pad-panel';

type LevelLabel =
    | 'consoleLevelAll'
    | 'consoleLevelError'
    | 'consoleLevelInfo'
    | 'consoleLevelLog'
    | 'consoleLevelWarn';

/** The levels the bar filters by, in the order a browser lists them. */
const LEVEL_LABELS: readonly { label: LevelLabel; value: ConsoleLevelFilter }[] = [
    { label: 'consoleLevelAll', value: 'all' },
    { label: 'consoleLevelLog', value: 'log' },
    { label: 'consoleLevelInfo', value: 'info' },
    { label: 'consoleLevelWarn', value: 'warn' },
    { label: 'consoleLevelError', value: 'error' },
];

/**
 * The console itself, as Postman draws its own: a bar to filter it by text and by level, its
 * settings, and every entry under it, oldest first, the newest at the bottom where the eye looks
 * for it. It is emptied by hand and put away by hand; nothing in it opens or closes on its own.
 * It is a card of its own under the work, apart from it by the gutter of the frame.
 */
export function ConsolePanel() {
    const messages = useMessages('shell');
    const entries = useStore(consoleStore, (state) => state.entries);
    const clear = useStore(consoleStore, (state) => state.clear);
    const hide = useStore(consoleStore, (state) => state.hide);
    const settings = useStore(consoleSettingsStore, (state) => state);
    const [query, setQuery] = useState('');
    const shown = useMemo(
        () => visibleEntries(entries, { ...settings, query }),
        [entries, settings, query],
    );

    return (
        <Card aria-label={messages('consoleTitle')}>
            <div className={BAND} data-part="console-header">
                <SearchInput
                    className="min-w-0 flex-1"
                    label={messages('consoleFilter')}
                    onValueChange={setQuery}
                    placeholder={messages('consoleFilterPlaceholder')}
                    value={query}
                />
                <Select
                    fitChosen
                    label={messages('consoleLevel')}
                    onValueChange={(level) => {
                        setConsoleSettings({ level });
                    }}
                    options={LEVEL_LABELS.map(({ label, value }) => ({
                        label: messages(label),
                        value,
                    }))}
                    value={settings.level}
                />
                <div className="flex shrink-0 items-center gap-gap-tight">
                    <ConsoleSettingsMenu />
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
                <ConsoleEntries
                    empty={messages(entries.length === 0 ? 'consoleEmpty' : 'consoleNoMatch')}
                    entries={shown}
                    label={messages('consoleList')}
                    showTimestamps={settings.showTimestamps}
                />
            </div>
        </Card>
    );
}
