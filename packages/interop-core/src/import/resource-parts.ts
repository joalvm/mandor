import type { Degradation } from '../resource/degradation.js';
import type {
    AuthConfig,
    ImportedScript,
    RequestLine,
    RequestScripts,
    Variable,
} from '@mandor/schema';

/** What a level holds once it is Mandor's. An absent key says nothing, as in its file. */
export type LevelSettings = {
    description?: string | undefined;
    variables?: Variable[] | undefined;
    auth?: AuthConfig | undefined;
    headers?: RequestLine[] | undefined;
    importedScripts?: ImportedScript[] | undefined;
    scripts?: RequestScripts | undefined;
};

/** The record without the keys nobody wrote: the file keeps no key for an absent value. */
export function definedOnly(record: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

/** Each sentence once, in the order it was first said. */
export function distinct(losses: readonly Degradation[]): Degradation[] {
    return [...new Map(losses.map((loss) => [JSON.stringify(loss), loss])).values()];
}

/** What a document wrote as text; a number or a flag is the text it prints, anything else says nothing. */
export function textOf(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }

    return typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
}

/** The name a thing enters under: its own, or the word of its kind when it has none to speak. */
export function nameOr(name: string, fallback: string): string {
    return name.trim() === '' ? fallback : name;
}

/** A list worth saying, or nothing: an absent key says nothing in a file, an empty list does. */
export function listOrNone<Each>(list: Each[]): Each[] | undefined {
    return list.length === 0 ? undefined : list;
}
