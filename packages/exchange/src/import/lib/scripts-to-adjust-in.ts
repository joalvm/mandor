import type { ImportPlan } from '@mandor/interop-core';

type Entry = ImportPlan['entries'][number];

/** How many scripts the record of a level holds: one per moment that has one. */
function countIn(scripts: unknown): number {
    if (typeof scripts !== 'object' || scripts === null) {
        return 0;
    }

    return Object.values(scripts).filter((entry) => typeof entry === 'object' && entry !== null)
        .length;
}

/** The scripts an entry brings from another app: none when it is not marked or is Mandor's own. */
function broughtBy({ selected, resource }: Entry): number {
    if (!selected || resource === null || resource.origin.kind === 'mandor') {
        return 0;
    }

    return countIn(resource.fields['scripts']);
}

/**
 * How many scripts of another app the import is about to write: the ones of every marked entry
 * that writes something. Each lands in the editor of its moment, as it came and not yet approved;
 * the window already holds the plan, so counting asks main nothing.
 */
export function scriptsToAdjustIn(plan: ImportPlan): number {
    return plan.entries.reduce((total, entry) => total + broughtBy(entry), 0);
}
