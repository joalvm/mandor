import { SCRIPT_LIMITS } from '../limits/script-limits.js';
import { clampEffects, type EffectLimits } from './clamp-effects.js';
import { clampText, cutLine, type TextLimits } from './clamp-text.js';
import { effectsTheEventAllows } from './event-effects.js';
import type { ScriptRunInput, ScriptRunOutput } from './script-run.js';

/** Every limit `clampOutput` reads. `SCRIPT_LIMITS` is the one source of the numbers. */
export type ClampLimits = TextLimits & EffectLimits;

/**
 * What main lets through of what a worker said, whatever the worker said. Logs and cases are cut
 * and marked, an effect the event cannot write is dropped, the rest are all kept or all refused,
 * and every cut leaves a line in the console after the ones the script wrote. The output it is
 * given is not changed.
 */
export function clampOutput(
    output: ScriptRunOutput,
    event: ScriptRunInput['event'],
    limits: ClampLimits = SCRIPT_LIMITS,
): ScriptRunOutput {
    const text = clampText(output.logs, output.tests, limits);
    const allowed = effectsTheEventAllows(output.effects, event);
    const checked = clampEffects(allowed.effects, limits);
    const { error } = output;

    return {
        effects: checked.effects,
        logs: [...text.logs, ...allowed.notes, ...checked.notes, ...text.notes],
        tests: text.tests,
        ...(error === undefined
            ? {}
            : { error: { ...error, message: cutLine(error.message, limits.lineBytes) } }),
    };
}
