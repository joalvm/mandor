import type { ImportPlan } from '@mandor/interop-core';

/**
 * How many scripts of another app the import is about to write: the ones of every marked entry
 * that writes something. They arrive as text that never runs, so each one is the person's to
 * adjust; the window already holds the plan, so counting asks main nothing.
 */
export function scriptsToAdjustIn(plan: ImportPlan): number {
    return plan.entries.reduce((total, entry) => {
        const scripts = entry.selected ? entry.resource?.fields['importedScripts'] : undefined;

        return total + (Array.isArray(scripts) ? scripts.length : 0);
    }, 0);
}
