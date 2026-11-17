import type { ScopeLevelName } from './variable-scope.js';

/** A name that resolved, the level that provided the value, and whether it is secret. */
export type UsedVariable = {
    name: string;
    level: ScopeLevelName;
    /**
     * Whether the level that gave the value declared this name secret. The redaction layer
     * reads it to hide whole the field the name helped build: a header encoded from a token
     * carries no literal token to look for.
     */
    secret: boolean;
};

/** A name appears once in `used`: it resolves the same way every time within one resolution. */
export function pushUsedOnce(used: UsedVariable[], entry: UsedVariable): void {
    if (used.some((candidate) => candidate.name === entry.name)) {
        return;
    }

    used.push(entry);
}

/** A name nobody defined, with the offsets in the template where it appeared. */
export type MissingVariable = {
    name: string;
    /**
     * Offsets of every `{{name}}` occurrence in the template the caller passed. Empty
     * when the name only surfaced inside the value of another variable: that offset
     * belongs to a text the caller never wrote, and pointing at it would underline the
     * wrong place.
     */
    positions: number[];
};

/** What resolving a template produced: the text, what was used and what was not found. */
export type ResolveTextResult = {
    text: string;
    used: UsedVariable[];
    missing: MissingVariable[];
    /**
     * Secret names left as `{{name}}` because the resolution ran with secrets off. Absent when
     * none was: a resolution with secrets on gives the same result it always gave.
     */
    withheld?: string[];
};

/** Adds the withheld names of a piece to a result, each name once. */
export function mergeWithheld(
    result: { withheld?: string[] },
    names: readonly string[] = [],
): void {
    for (const name of names) {
        result.withheld ??= [];

        if (!result.withheld.includes(name)) {
            result.withheld.push(name);
        }
    }
}
