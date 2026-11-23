import { ownScriptsOrNothing, type ScriptEntry } from '@mandor/schema';

type ScriptsOf<Event extends string> = Partial<Record<Event, ScriptEntry | undefined>>;

/**
 * The scripts of a level with the one of an event replaced. An empty text that would run is no
 * script, and a level left with none keeps no key: the file reads as it did before anyone typed.
 * A script switched off stays, empty or not: the switch is what the person set.
 */
export function withScript<Event extends string>(
    scripts: ScriptsOf<Event> | undefined,
    event: NoInfer<Event>,
    entry: ScriptEntry,
): ScriptsOf<Event> | undefined {
    const next: ScriptsOf<Event> = { ...scripts };

    if (entry.source === '' && entry.enabled !== false) {
        Reflect.deleteProperty(next, event);
    } else {
        next[event] = entry;
    }

    return ownScriptsOrNothing(next);
}

/** The script of an event with its switch flipped: on is no key at all, as the file keeps it. */
export function switchedScript(entry: ScriptEntry | undefined, enabled: boolean): ScriptEntry {
    const source = entry?.source ?? '';

    return enabled ? { source } : { source, enabled: false };
}

/**
 * What the name of a moment tells from the list without opening it: a dot when it holds code,
 * dimmed when it is switched off. A text of blanks is no code.
 */
export function momentMarksOf(entry: ScriptEntry | undefined): { filled: boolean; muted: boolean } {
    return { filled: (entry?.source ?? '').trim() !== '', muted: entry?.enabled === false };
}
