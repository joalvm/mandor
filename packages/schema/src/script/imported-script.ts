/** Where a script of another tool hooks in. The events of Async join when an import brings them. */
export const IMPORTED_SCRIPT_EVENTS = ['onBeforeRequest', 'onResponse'] as const;

export type ImportedScriptEvent = (typeof IMPORTED_SCRIPT_EVENTS)[number];

/** Whose API the script was written for: the tool it came from. */
export const SCRIPT_DIALECTS = ['postman', 'insomnia'] as const;

export type ScriptDialect = (typeof SCRIPT_DIALECTS)[number];

/**
 * A script that came in with an import: the text of another app, kept as it came. It never
 * runs. The person turns it into a script of their own, which is the only kind that does.
 */
export type ImportedScript = {
    event: ImportedScriptEvent;
    dialect: ScriptDialect;
    source: string;
};
