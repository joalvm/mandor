import {
    mergeWithheld,
    type MissingVariable,
    pushUsedOnce,
    type UsedVariable,
} from './resolve-text-result.js';
import { resolveText } from './resolve-text.js';
import type { VariableScope } from './variable-scope.js';

/** A missing name tagged with the field whose template referenced it. */
type FieldMissing = MissingVariable & {
    /** Key of the template in the input object where the name is missing. */
    field: string;
};

/** What resolving an object of templates produced: each resolved value, and the fused report. */
export type ResolveTemplatesResult = {
    /** Every input key with its resolved text. */
    values: Record<string, string>;
    used: UsedVariable[];
    missing: FieldMissing[];
    /** Secret names left literal in the fields that resolved with secrets off. */
    withheld?: string[];
};

/** Which fields resolve with secrets off: the ones a script wrote, by their key. */
type ResolveTemplatesOptions = { secretsOff?: (field: string) => boolean };

/**
 * Resolves every template of the object against the scope — the URL and the headers of a
 * connection arrive together. The missing names of all the fields are fused into one list
 * where each entry names its field, so the interface can point at the exact field without
 * scanning the texts again.
 */
export function resolveTemplates(
    templates: Record<string, string>,
    scope: VariableScope,
    options: ResolveTemplatesOptions = {},
): ResolveTemplatesResult {
    const result: ResolveTemplatesResult = { values: {}, used: [], missing: [] };
    const { values, used, missing } = result;

    for (const [field, template] of Object.entries(templates)) {
        const off = options.secretsOff?.(field) === true;
        const resolved = resolveText(template, scope, off ? { secrets: 'off' } : {});

        values[field] = resolved.text;

        for (const entry of resolved.used) {
            pushUsedOnce(used, entry);
        }

        for (const entry of resolved.missing) {
            missing.push({ ...entry, field });
        }

        mergeWithheld(result, resolved.withheld);
    }

    return result;
}
