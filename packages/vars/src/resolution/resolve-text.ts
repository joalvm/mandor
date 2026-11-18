import {
    mergeWithheld,
    type MissingVariable,
    pushUsedOnce,
    type ResolveTextResult,
} from './resolve-text-result.js';
import { scanTemplate, type TemplateSegment } from './scan-template.js';
import type { ScopeLevelName, VariableScope } from './variable-scope.js';
import { lookupVariable } from './lookup-variable.js';

/** Deepest chain of nested references one resolution follows before giving up. */
export const MAX_RESOLUTION_DEPTH = 10;

/**
 * What one resolution may copy: names looked up, and characters of their values. An environment
 * comes down from an origin like any file, and a few lines that name each other over and over
 * would otherwise ask more text than the machine holds, in main as it sends and in the window as
 * it paints.
 */
export const MAX_EXPANSIONS = 100_000;

export const MAX_EXPANDED_LENGTH = 16 * 1024 * 1024;

type Budget = { expansions: number; length: number };

/** How a resolution treats a secret value: `off` leaves its `{{name}}` in the text. */
export type ResolveOptions = { secrets?: 'on' | 'off' };

/** A level whose values resolve what they nest with secrets off: the script wrote them. */
const NESTED_SECRETS: Partial<Record<ScopeLevelName, 'off'>> = { script: 'off' };

type ResolutionState = {
    scope: VariableScope;
    /** Names being resolved right now, in order. The cycle detector: no name may repeat. */
    chain: readonly string[];
    /** Shared by the whole resolution, nested values included. */
    budget: Budget;
    secrets: 'on' | 'off';
};

/**
 * Substitutes every `{{name}}` of the template against the scope, strongest level first.
 * A value that itself contains `{{...}}` resolves again, recursively, until no placeholder
 * remains. A name nobody defined stays as `{{name}}` in the text and is reported in `missing`
 * with the offset of each appearance: undefined is not empty. A name that repeats in its own
 * chain, or one past `MAX_RESOLUTION_DEPTH`, stays as `{{name}}` too: a loop in the variables
 * is the user's to see in what goes out, never a send or a drawing that breaks. So does a name
 * met once the resolution has spent its budget.
 *
 * With secrets `off` a secret name stays as `{{name}}` and is named in `withheld`. A value a
 * script set resolves what it nests with secrets off, whatever the caller asked: a script can
 * write `{{token}}` into a variable, and that is not the person asking for the token.
 */
export function resolveText(
    template: string,
    scope: VariableScope,
    options: ResolveOptions = {},
): ResolveTextResult {
    const budget = { expansions: MAX_EXPANSIONS, length: MAX_EXPANDED_LENGTH };

    return resolveInto(template, { scope, chain: [], budget, secrets: options.secrets ?? 'on' });
}

function resolveInto(template: string, state: ResolutionState): ResolveTextResult {
    const result: ResolveTextResult = { text: '', used: [], missing: [] };

    for (const segment of scanTemplate(template)) {
        const piece = resolveSegment(segment, state);

        result.text += piece.text;
        mergePiece(result, piece);
    }

    return result;
}

function resolveSegment(segment: TemplateSegment, state: ResolutionState): ResolveTextResult {
    if (segment.kind === 'literal') {
        return { text: segment.text, used: [], missing: [] };
    }

    return resolveVariable(segment.name, segment.index, state);
}

function resolveVariable(name: string, index: number, state: ResolutionState): ResolveTextResult {
    const found = lookupVariable(state.scope, name);
    const looped = state.chain.includes(name) || state.chain.length >= MAX_RESOLUTION_DEPTH;

    if (found === undefined) {
        return { text: `{{${name}}}`, used: [], missing: [missingEntry(name, index, state)] };
    }

    if (found.secret && state.secrets === 'off') {
        return { text: `{{${name}}}`, used: [], missing: [], withheld: [name] };
    }

    if (looped || !spend(state.budget, found.value)) {
        return { text: `{{${name}}}`, used: [], missing: [] };
    }

    const chain = [...state.chain, name];
    const secrets = NESTED_SECRETS[found.level] ?? state.secrets;
    const resolved = resolveInto(found.value, { ...state, chain, secrets });

    return {
        ...resolved,
        used: [{ name, level: found.level, secret: found.secret }, ...resolved.used],
    };
}

/** Takes one lookup and the value's length from the budget, or says it has not enough left. */
function spend(budget: Budget, value: string): boolean {
    if (budget.expansions === 0 || value.length > budget.length) {
        return false;
    }

    budget.expansions -= 1;
    budget.length -= value.length;

    return true;
}

/** The offset belongs to the caller's text; a nested resolution scans a value, not that text. */
function missingEntry(name: string, index: number, state: ResolutionState): MissingVariable {
    if (state.chain.length === 0) {
        return { name, positions: [index] };
    }

    return { name, positions: [] };
}

function mergePiece(result: ResolveTextResult, piece: ResolveTextResult): void {
    for (const entry of piece.used) {
        pushUsedOnce(result.used, entry);
    }

    for (const entry of piece.missing) {
        pushMissingOnce(result.missing, entry);
    }

    mergeWithheld(result, piece.withheld);
}

/** One entry per name; every appearance adds its offset, so the interface paints them all. */
function pushMissingOnce(missing: MissingVariable[], entry: MissingVariable): void {
    const existing = missing.find((candidate) => candidate.name === entry.name);

    if (existing === undefined) {
        missing.push(entry);

        return;
    }

    existing.positions.push(...entry.positions);
}
