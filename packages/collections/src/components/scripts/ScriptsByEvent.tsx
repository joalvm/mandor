import { useMessages } from '@mandor/i18n';
import type { SCRIPT_EVENTS, ScriptEntry, ScriptLevel } from '@mandor/schema';
import type { ScriptContext } from '@mandor/script';
import { useResourceSection } from '@mandor/shell';
import { Switch, Tabs, TabsList, TabsPanel, TabsStrip, TabsTab } from '@mandor/ui';

import type { ScriptPlace } from '../../hooks/useScriptApproval.js';
import { momentMarksOf, switchedScript, withScript } from '../../lib/script-entries.js';
import { EventScript } from './EventScript.js';

type ScriptEvent = (typeof SCRIPT_EVENTS)[number];

type ScriptsOf<Event extends ScriptEvent> = Partial<Record<Event, ScriptEntry | undefined>>;

type ScriptsByEventProps<Event extends ScriptEvent> = {
    /**
     * What the editors complete with: the variables of the place, the headers of its request and
     * a sample of what it reads. Kept by identity: a new one rebuilds what the editors know.
     */
    context: ScriptContext;
    /** The moments the level runs scripts at, in the order they come. */
    events: readonly [Event, ...Event[]];
    /** Where the scripts sit, which is what an approval is kept by. */
    place: Omit<ScriptPlace, 'event'>;
    /** Who owns the texts: two views of one place share their documents and their moment. */
    resource: string;
    scripts: ScriptsOf<Event> | undefined;
    /** The scripts as they are now; `undefined` once none is left. */
    onChange: (scripts: ScriptsOf<Event> | undefined) => void;
};

/** The key of the name of a moment, the same in the list and over its editor. */
type MomentLabel = `scriptEvent-${ScriptEvent}`;

type MomentProps<Event extends ScriptEvent> = ScriptsByEventProps<Event> & { event: Event };

/** The name of each moment. */
const LABEL_OF: Readonly<Record<ScriptEvent, MomentLabel>> = {
    onBeforeConnect: 'scriptEvent-onBeforeConnect',
    onBeforeRequest: 'scriptEvent-onBeforeRequest',
    onConnect: 'scriptEvent-onConnect',
    onMessage: 'scriptEvent-onMessage',
    onResponse: 'scriptEvent-onResponse',
};

/** What the list of moments is read aloud as: the moments of a send, or of a connection. */
const LIST_LABEL_OF: Readonly<
    Record<ScriptLevel, 'scriptEvents-connection' | 'scriptEvents-send'>
> = {
    collection: 'scriptEvents-send',
    connection: 'scriptEvents-connection',
    folder: 'scriptEvents-send',
    request: 'scriptEvents-send',
};

/** The moment open is remembered apart from the section of the strip over it. */
const STRIP = 'scripts';

/**
 * The scripts of one place, by the moment they run at: the moments in a column on the left, each
 * with a dot when it holds code and its name dimmed when it is switched off, and the script of the
 * one open on the right, under a header with its name and its switch. A script that would not run
 * as it is carries its band above the text, which stays readable. The column is walked with the
 * arrows up and down; the moment open stays while the place is. Where the place is too narrow for
 * the column and a script beside it, as in the half of a small window, the moments go over the
 * script in a strip and the script takes the whole width.
 */
export function ScriptsByEvent<Event extends ScriptEvent>(props: ScriptsByEventProps<Event>) {
    const labels = useMessages('collections');
    const { events, place, resource, scripts } = props;
    const [remembered, setOpen] = useResourceSection(resource, events[0], STRIP);
    const open = events.find((each) => each === remembered) ?? events[0];

    return (
        <Tabs onValueChange={setOpen} orientation="fit" value={open}>
            <TabsStrip>
                <TabsList label={labels(LIST_LABEL_OF[place.level])}>
                    {events.map((each) => {
                        const name: MomentLabel = LABEL_OF[each];

                        return (
                            <TabsTab
                                key={each}
                                label={labels(name)}
                                value={each}
                                {...momentMarksOf(scripts?.[each])}
                            />
                        );
                    })}
                </TabsList>
            </TabsStrip>
            {events.map((each) => (
                <TabsPanel key={each} value={each}>
                    <Moment {...props} event={each} />
                </TabsPanel>
            ))}
        </Tabs>
    );
}

/** The script of one moment: its name and its switch over it; switched off, its text stays. */
function Moment<Event extends ScriptEvent>(props: MomentProps<Event>) {
    const labels = useMessages('collections');
    const { context, event, onChange, place, resource, scripts } = props;
    const entry = scripts?.[event];
    const name: MomentLabel = LABEL_OF[event];

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="script-moment">
            <header className="flex h-header shrink-0 items-center gap-gap-control px-pad-control">
                <h3 className="min-w-0 flex-1 truncate text-sm font-medium text-text-primary">
                    {labels(name)}
                </h3>
                <Switch
                    checked={entry?.enabled !== false}
                    label={labels('scriptEnabled')}
                    onCheckedChange={(enabled) => {
                        onChange(withScript(scripts, event, switchedScript(entry, enabled)));
                    }}
                    withLabel
                />
            </header>
            <EventScript
                context={context}
                entry={entry}
                modelKey={`${resource}:script:${event}`}
                onChange={(next) => {
                    onChange(withScript(scripts, event, next));
                }}
                place={{ ...place, event }}
            />
        </div>
    );
}
