import { degradation, type Degradation, type ImportPlan } from '@mandor/interop-core';

const origin = { kind: 'asyncapi' as const, sourceId: 'abc' };

type Place = ImportPlan['entries'][number]['place'];

/** One entry of a plan that adds what it names, with the route as its name too. */
export function entryOf(place: Place, route: string, degradations: Degradation[] = []) {
    return {
        class: 'add' as const,
        place,
        route,
        name: route,
        resource: {
            place,
            itemKind: place === 'item' ? 'message' : null,
            route,
            name: route,
            fields: {},
            origin,
            degradations,
        },
        selected: true,
    };
}

/** A leaf the app keeps no place for: unmarked, with the reason it was left out. */
export function leftOutEntry(route: string) {
    return {
        ...entryOf('connection', route),
        leftOut: degradation('leftOutConnections'),
        selected: false,
    };
}

export function planOf(entries: ImportPlan['entries']): ImportPlan {
    return { identity: origin, entries };
}
