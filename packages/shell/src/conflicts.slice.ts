import type { ConflictSummary } from '@mandor/ipc';
import type { ChangedEntity } from '@mandor/schema';

export type ConflictsSlice = {
    /** The clashes of the open origin that wait for a person, newest first as main lists them. */
    conflicts: ConflictSummary[];
};

export function initialConflictsSlice(): ConflictsSlice {
    return { conflicts: [] };
}

/** What the window does to the list of clashes it was told about. */
export type ConflictsActions = {
    setConflicts: (conflicts: readonly ConflictSummary[]) => void;
};

export function conflictsActionsFor(
    set: (partial: Partial<ConflictsSlice>) => void,
): ConflictsActions {
    return {
        setConflicts: (conflicts) => {
            set({ conflicts: [...conflicts] });
        },
    };
}

const NONE: ConflictSummary[] = [];

/** Read by reference: an empty list is always the same one, so nothing redraws for it. */
export function selectConflicts(state: ConflictsSlice): readonly ConflictSummary[] {
    return state.conflicts.length === 0 ? NONE : state.conflicts;
}

function sameEntity(left: ChangedEntity, right: ChangedEntity): boolean {
    const a: Record<string, string> = left;
    const b: Record<string, string> = right;
    const keys = Object.keys(a);

    return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}

/** The clash an entity is part of, or nothing: what a row asks to know whether to be marked. */
export function selectConflictFor(
    state: ConflictsSlice,
    entity: ChangedEntity,
): ConflictSummary | undefined {
    return state.conflicts.find((conflict) => sameEntity(conflict.entity, entity));
}
