/** Where a script of the user hooks into a request. */
export const REQUEST_SCRIPT_EVENTS = ['onBeforeRequest', 'onResponse'] as const;

export type RequestScriptEvent = (typeof REQUEST_SCRIPT_EVENTS)[number];

/** Where a script of the user hooks into a connection. */
export const CONNECTION_SCRIPT_EVENTS = ['onBeforeConnect', 'onConnect', 'onMessage'] as const;

export type ConnectionScriptEvent = (typeof CONNECTION_SCRIPT_EVENTS)[number];

/** Every event a script of the user hooks in at: those of a request, then those of a connection. */
export const SCRIPT_EVENTS = [...REQUEST_SCRIPT_EVENTS, ...CONNECTION_SCRIPT_EVENTS] as const;

/** Where a script sits in a workspace. */
export const SCRIPT_LEVELS = ['request', 'folder', 'collection', 'connection'] as const;

export type ScriptLevel = (typeof SCRIPT_LEVELS)[number];

/**
 * A script the user wrote, as text. The text has no limit here, so no file turns unreadable: the
 * size is looked at when the script runs. `enabled` is absent until somebody switches it off.
 */
export type ScriptEntry = {
    source: string;
    enabled?: boolean | undefined;
};

/** One script per event at a level of the tree. */
export type RequestScripts = Partial<Record<RequestScriptEvent, ScriptEntry | undefined>>;

/** One script per event of a connection. */
export type ConnectionScripts = Partial<Record<ConnectionScriptEvent, ScriptEntry | undefined>>;

/**
 * Whether a level holds a script for any event, known or not. An empty map, or one whose events
 * are all unset, holds none.
 */
export function hasOwnScripts(scripts: unknown): boolean {
    return (
        typeof scripts === 'object' &&
        scripts !== null &&
        Object.values(scripts).some((entry) => entry !== undefined)
    );
}

/** The scripts of a level as its file keeps them: no key at all when they hold none. */
export function ownScriptsOrNothing<Scripts>(scripts: Scripts): Scripts | undefined {
    return hasOwnScripts(scripts) ? scripts : undefined;
}
