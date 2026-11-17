import { EventScript, switchedScript, withScript } from '@mandor/collections';
import { useMessages } from '@mandor/i18n';
import {
    REQUEST_SCRIPT_EVENTS,
    type RequestScriptEvent,
    type RequestScripts,
    type ScriptLevel,
} from '@mandor/schema';
import { useResourceSection } from '@mandor/shell';
import { Switch, Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '@mandor/ui';

type EventScriptsProps = {
    /** Where the scripts sit: a request, or the folder or collection over it. */
    level: ScriptLevel;
    /** Who owns the texts: two views of one place share their documents. */
    resource: string;
    scripts: RequestScripts | undefined;
    workspaceId: string;
    /** The scripts as they are now; `undefined` once none is left. */
    onChange: (scripts: RequestScripts | undefined) => void;
};

type EventScriptProps = EventScriptsProps & { event: RequestScriptEvent };

/** The heading of each script, by the moment of the send it runs at. */
const HEADING_OF_EVENT: Readonly<
    Record<RequestScriptEvent, 'scriptEventBefore' | 'scriptEventResponse'>
> = {
    onBeforeRequest: 'scriptEventBefore',
    onResponse: 'scriptEventResponse',
};

/** The strip of the scripts is remembered apart from the strip of the sections. */
const STRIP = 'scripts';

/**
 * The scripts of one place, one tab per moment of the send, each with its switch. A script that
 * would not run as it is carries its band above the text, which stays readable.
 */
export function EventScripts(props: EventScriptsProps) {
    const labels = useMessages('requests');
    const [remembered, setOpen] = useResourceSection(props.resource, 'onBeforeRequest', STRIP);
    const open = REQUEST_SCRIPT_EVENTS.find((each) => each === remembered) ?? 'onBeforeRequest';

    return (
        <Tabs onValueChange={setOpen} value={open}>
            <TabsStrip>
                <TabsList label={labels('scriptEvents')}>
                    {REQUEST_SCRIPT_EVENTS.map((each) => (
                        <TabsTab key={each} label={labels(HEADING_OF_EVENT[each])} value={each} />
                    ))}
                </TabsList>
                <EventScriptSwitch {...props} event={open} />
            </TabsStrip>
            {REQUEST_SCRIPT_EVENTS.map((each) => (
                <TabsPanel key={each} value={each}>
                    <EventScriptOf {...props} event={each} />
                </TabsPanel>
            ))}
        </Tabs>
    );
}

function EventScriptSwitch({ event, onChange, scripts }: EventScriptProps) {
    const labels = useMessages('requests');
    const entry = scripts?.[event];

    return (
        <Switch
            checked={entry?.enabled !== false}
            className="ml-auto"
            label={labels('scriptEnabled')}
            onCheckedChange={(enabled) => {
                onChange(withScript(scripts, event, switchedScript(entry, enabled)));
            }}
            withLabel
        />
    );
}

function EventScriptOf({
    event,
    level,
    onChange,
    resource,
    scripts,
    workspaceId,
}: EventScriptProps) {
    return (
        <EventScript
            entry={scripts?.[event]}
            modelKey={`${resource}:script:${event}`}
            onChange={(entry) => {
                onChange(withScript(scripts, event, entry));
            }}
            place={{ event, level, workspaceId }}
        />
    );
}
