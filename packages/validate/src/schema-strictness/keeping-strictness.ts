import {
    schemaStrictnessOf,
    withAllRequired,
    withClosedObjects,
    type StrictnessState,
} from './schema-strictness.js';

/** Whether the objects a schema writes again close: only when every old one did. */
const CLOSES_AGAIN: Record<StrictnessState, boolean> = { all: true, none: false, some: false };

/**
 * A schema written again from a value, keeping the options the old one held for every object:
 * objects that all closed close again, and keys stay optional when the old schema declared keys
 * and required none of them. An option only some objects kept says nothing of the new objects,
 * which take what the generation writes; so does a schema that declared no key to choose about.
 */
export function keepingStrictness(previous: string, generated: string): string {
    const kept = schemaStrictnessOf(previous);
    const closed = CLOSES_AGAIN[kept?.closed ?? 'none']
        ? withClosedObjects(generated, true)
        : generated;
    const choseOptional = kept?.required === 'none' && withAllRequired(previous, true) !== previous;

    return choseOptional ? withAllRequired(closed, false) : closed;
}
