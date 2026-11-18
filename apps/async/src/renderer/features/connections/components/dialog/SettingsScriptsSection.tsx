import { EventScript, switchedScript, withScript } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import {
    CONNECTION_SCRIPT_EVENTS,
    type Connection,
    type ConnectionScriptEvent,
} from '@mandor/schema';
import { Switch, Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '@mandor/ui';
import { useState } from 'react';

import type { ConnectionWrite } from '../../lib/pending-connection-write.js';

type SettingsScriptsSectionProps = {
    connection: Connection;
    workspaceId: string;
    onConnectionChange: (changes: ConnectionWrite) => void;
};

type ScriptOfEventProps = SettingsScriptsSectionProps & { event: ConnectionScriptEvent };

type HeadingKey = 'scriptEventOnBeforeConnect' | 'scriptEventOnConnect' | 'scriptEventOnMessage';

/** The heading of each script, by the moment of the connection it runs at. */
const HEADING_OF_EVENT: Readonly<Record<ConnectionScriptEvent, HeadingKey>> = {
    onBeforeConnect: 'scriptEventOnBeforeConnect',
    onConnect: 'scriptEventOnConnect',
    onMessage: 'scriptEventOnMessage',
};

/**
 * The scripts of the connection, one tab per moment it runs at, each with its switch. Which tab
 * is in front is where the reader stands in the dialog, so closing it forgets it. What a script
 * can never write is said once over the tabs: the auth and the subprotocols stay as typed.
 */
export function SettingsScriptsSection(props: SettingsScriptsSectionProps) {
    const labels = useMessages('connections');
    const [open, setOpen] = useState<ConnectionScriptEvent>('onBeforeConnect');

    return (
        <div
            className="flex h-full min-h-0 min-w-0 flex-col gap-gap-control"
            data-part="scripts-settings"
        >
            <p className="py-1 text-xs text-text-secondary">{labels('scriptsHelp')}</p>
            <Tabs
                onValueChange={(value) => {
                    setOpen(CONNECTION_SCRIPT_EVENTS.find((each) => each === value) ?? open);
                }}
                value={open}
            >
                <TabsStrip>
                    <TabsList label={labels('scriptEvents')}>
                        {CONNECTION_SCRIPT_EVENTS.map((each) => (
                            <TabsTab
                                key={each}
                                label={labels(HEADING_OF_EVENT[each])}
                                value={each}
                            />
                        ))}
                    </TabsList>
                    <ScriptSwitch {...props} event={open} />
                </TabsStrip>
                {CONNECTION_SCRIPT_EVENTS.map((each) => (
                    <TabsPanel key={each} value={each}>
                        <ScriptOfEvent {...props} event={each} />
                    </TabsPanel>
                ))}
            </Tabs>
        </div>
    );
}

/** Whether the script of the moment in front runs; switched off, its text stays. */
function ScriptSwitch({ connection, event, onConnectionChange }: ScriptOfEventProps) {
    const labels = useMessages('connections');
    const { scripts } = connection;
    const entry = scripts?.[event];

    return (
        <Switch
            checked={entry?.enabled !== false}
            className="ml-auto"
            label={labels('scriptEnabled')}
            onCheckedChange={(enabled) => {
                onConnectionChange({
                    scripts: withScript(scripts, event, switchedScript(entry, enabled)),
                });
            }}
            withLabel
        />
    );
}

function ScriptOfEvent({ connection, event, onConnectionChange, workspaceId }: ScriptOfEventProps) {
    const { scripts } = connection;

    return (
        <EventScript
            entry={scripts?.[event]}
            modelKey={`connection:${workspaceId}/${connection.id}:script:${event}`}
            onChange={(entry) => {
                onConnectionChange({ scripts: withScript(scripts, event, entry) });
            }}
            place={{ event, level: 'connection', workspaceId }}
        />
    );
}
