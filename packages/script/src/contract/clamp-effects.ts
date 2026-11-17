import { scriptNotice, type ScriptNotice } from '@mandor/schema';

import type { ScriptEffect } from './script-run.js';
import { byteLength } from './utf8.js';

/** What the effects of one run may spend. */
export type EffectLimits = {
    variables: number;
    variableBytes: number;
    variablesBytes: number;
    payloadBytes: number;
    socketSendsPerRun: number;
};

type VarEffect = Extract<ScriptEffect, { kind: 'var' }>;
type Check = (effects: readonly ScriptEffect[], limits: EffectLimits) => ScriptNotice | undefined;

/** Names that would reach the prototype of an object, or that name nothing. */
const FORBIDDEN_NAMES: ReadonlySet<string> = new Set(['__proto__', 'constructor', 'prototype', '']);

/**
 * Whether a script may write by this name. A brace is fine in a header or a query, which take any
 * text, but not in a variable: a `{{name}}` could never mean it.
 */
function usableName(effect: ScriptEffect, name: string): boolean {
    const braced = name.includes('{') || name.includes('}');

    return !FORBIDDEN_NAMES.has(name) && !(isVar(effect) && braced);
}

function isVar(effect: ScriptEffect): effect is VarEffect {
    return effect.kind === 'var';
}

const tooManyVariables: Check = (effects, { variables }) => {
    const count = effects.filter(isVar).length;

    return count > variables
        ? scriptNotice('effects-too-many-variables', { count, limit: variables })
        : undefined;
};

const bigVariable: Check = (effects, { variableBytes }) => {
    const big = effects.filter(isVar).find(({ value }) => byteLength(value) > variableBytes);

    return big === undefined
        ? undefined
        : scriptNotice('effects-variable-too-large', { name: big.name, limit: variableBytes });
};

const bigVariables: Check = (effects, { variablesBytes }) => {
    const total = effects
        .filter(isVar)
        .reduce((sum, { name, value }) => sum + byteLength(name) + byteLength(value), 0);

    return total > variablesBytes
        ? scriptNotice('effects-variables-too-large', { limit: variablesBytes })
        : undefined;
};

const bigText: Check = (effects, { payloadBytes }) =>
    effects.some(({ value }) => byteLength(value ?? '') > payloadBytes)
        ? scriptNotice('effects-text-too-large', { limit: payloadBytes })
        : undefined;

const tooManySends: Check = (effects, { socketSendsPerRun }) => {
    const count = effects.filter(({ kind }) => kind === 'socket').length;

    return count > socketSendsPerRun
        ? scriptNotice('effects-too-many-sends', { count, limit: socketSendsPerRun })
        : undefined;
};

const CHECKS: readonly Check[] = [
    tooManyVariables,
    bigVariable,
    bigVariables,
    bigText,
    tooManySends,
];

/** The first limit the effects as a whole break, as the reason they are all refused. */
function reasonToRefuse(
    effects: readonly ScriptEffect[],
    limits: EffectLimits,
): ScriptNotice | undefined {
    return CHECKS.map((check) => check(effects, limits)).find((reason) => reason !== undefined);
}

/**
 * The effects of a run inside their limits. An effect by a name no script may use is dropped, with
 * a note, and the rest stay. Past a limit of the run, none of the effects stays: a run that did
 * half of what it meant to is worse than one that did nothing, and says so.
 */
export function clampEffects(
    effects: readonly ScriptEffect[],
    limits: EffectLimits,
): { effects: ScriptEffect[]; notes: ScriptNotice[] } {
    const notes: ScriptNotice[] = [];
    const named = effects.filter((effect) => {
        const name = 'name' in effect ? effect.name : undefined;
        const usable = name === undefined || usableName(effect, name);

        if (!usable) {
            notes.push(scriptNotice('effect-name-forbidden', { name }));
        }

        return usable;
    });
    const reason = reasonToRefuse(named, limits);

    return reason === undefined
        ? { effects: named, notes }
        : { effects: [], notes: [...notes, reason] };
}
