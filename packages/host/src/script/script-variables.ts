import { SCRIPT_LIMITS } from '@mandor/script';

/** Where the values a script set live: one origin, one workspace, one environment. */
export type ScriptVariablesPlace = {
    origin: string;
    workspaceId: string;
    environmentId: string | null;
};

type ScriptVariableSet = { name: string; value: string };

/** What became of the values of one run: kept, too late, or over what the place may hold. */
type ApplyVerdict = 'applied' | 'stale' | 'full';

type VariableLimits = Record<'variables' | 'variableBytes' | 'variablesBytes', number>;

export type ScriptVariables = {
    values(place: ScriptVariablesPlace): Record<string, string>;
    /** The generation a run reads when it starts, and hands back with what it set. */
    generation(place: ScriptVariablesPlace): number;
    /** Keeps what one run set, in order, the last one winning; all of it or none. */
    apply(
        place: ScriptVariablesPlace,
        generation: number,
        sets: readonly ScriptVariableSet[],
    ): ApplyVerdict;
    /** Forgets every value of a workspace, in all its environments: what comes late is dropped. */
    clear(place: Omit<ScriptVariablesPlace, 'environmentId'>): void;
    /** What forgetting the approvals does: every place moves on, and what comes late is dropped. */
    forget(): void;
};

function workspaceKey(place: Omit<ScriptVariablesPlace, 'environmentId'>): string {
    return JSON.stringify([place.origin, place.workspaceId]);
}

function fits(values: ReadonlyMap<string, string>, limits: VariableLimits): boolean {
    let total = 0;

    for (const [name, value] of values) {
        const bytes = Buffer.byteLength(value);

        if (bytes > limits.variableBytes) {
            return false;
        }

        total += Buffer.byteLength(name) + bytes;
    }

    return values.size <= limits.variables && total <= limits.variablesBytes;
}

/**
 * The values scripts set, in the memory of main and nowhere else: never a file, never a repo, gone
 * when the app closes. A place is an origin, a workspace and an environment. Clearing a workspace
 * or forgetting the approvals moves the generation on, so a run that started before cannot write
 * after.
 */
export function createScriptVariables(limits: VariableLimits = SCRIPT_LIMITS): ScriptVariables {
    const workspaces = new Map<string, Map<string, Map<string, string>>>();
    const clearedAt = new Map<string, number>();
    let moves = 0;
    let forgotAt = 0;

    function generation(place: ScriptVariablesPlace): number {
        return Math.max(clearedAt.get(workspaceKey(place)) ?? 0, forgotAt);
    }

    function environmentsOf(place: ScriptVariablesPlace): Map<string, Map<string, string>> {
        const key = workspaceKey(place);
        const known = workspaces.get(key) ?? new Map<string, Map<string, string>>();

        workspaces.set(key, known);

        return known;
    }

    return {
        values: (place) =>
            Object.fromEntries(
                workspaces.get(workspaceKey(place))?.get(place.environmentId ?? '') ?? [],
            ),
        generation,
        apply(place, started, sets) {
            if (started !== generation(place)) {
                return 'stale';
            }

            const environments = environmentsOf(place);
            const next = new Map(environments.get(place.environmentId ?? ''));

            for (const { name, value } of sets) {
                next.delete(name);
                next.set(name, value);
            }

            if (!fits(next, limits)) {
                return 'full';
            }

            environments.set(place.environmentId ?? '', next);

            return 'applied';
        },
        clear(place) {
            moves += 1;
            clearedAt.set(workspaceKey(place), moves);
            workspaces.delete(workspaceKey(place));
        },
        forget() {
            moves += 1;
            forgotAt = moves;
            workspaces.clear();
        },
    };
}
