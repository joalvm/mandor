import type { Degradation } from '../resource/degradation.js';
import type { ItemOrigin } from '@mandor/schema';

import type { ExistingResource } from '../resource/existing-resource.js';
import type { ImportResource } from '../resource/import-resource.js';
import type { ResourcePlace } from '../resource/resource-place.js';
import { placeCollection } from './place-collection.js';

/** The four differences a plan can state about one resource. They are closed: a fifth is a bug. */
export const IMPORT_PLAN_ENTRY_CLASSES = ['add', 'update', 'removal', 'conflict'] as const;

export type ImportPlanEntryClass = (typeof IMPORT_PLAN_ENTRY_CLASSES)[number];

/** What the import would do to one resource. The user reads these before anything touches disk. */
export type ImportPlanEntry = {
    class: ImportPlanEntryClass;
    place: ResourcePlace;
    route: string;
    name: string;
    /**
     * What would be written, verbatim. Null for a removal, which writes nothing, and for a
     * conflict, which may not: the route is held by someone else and the user settles it first.
     */
    resource: ImportResource | null;
    /**
     * Whether the user is letting this one in. Everything the document carries starts in; a
     * removal starts out, because nothing is deleted without being marked on purpose; and an
     * update of an item the user edited since the last import starts out too, so their edits
     * are not written over by a checkbox they never unticked.
     */
    selected: boolean;
    /**
     * Why this leaf stays out of the app it arrives in, when the app keeps no place for what it
     * is. What the format could not carry whole is the resource's own `degradations`: it enters
     * all the same, and says so.
     */
    leftOut?: Degradation | undefined;
};

/**
 * The whole difference an import would make in a workspace, before anything is written. Carrying
 * nothing is a plan too: it names nobody, and a plan that names nobody can attribute no removal.
 */
export type ImportPlan = {
    identity: ItemOrigin | null;
    entries: ImportPlanEntry[];
};

/**
 * Diffs what the import would write against what the workspace already holds. The same origin is
 * an update, a route held by anyone else is a conflict, and what a source wrote last time and
 * no longer carries is a removal. Nothing here resolves anything: deciding is the user's. The
 * collection the document arrives as is placed first, so the diff compares the routes it will
 * take; `mint` draws the id of a collection that is new to the workspace.
 *
 * Each resource is compared against its own origin: the files of one drop may come from several
 * sources, a collection and an environment each with theirs, and none of them stands in the way
 * of the others. The first origin names the import.
 */
export function importPlan(
    resources: readonly ImportResource[],
    existing: readonly ExistingResource[],
    mint: () => string,
): ImportPlan {
    const identity = resources[0]?.origin ?? null;
    const placed = placeCollection(resources, existing, mint);
    const planned = placed.map((resource) => entryOf(resource, existing));

    return { identity, entries: [...planned, ...removalsOf(placed, existing)] };
}

function entryOf(resource: ImportResource, existing: readonly ExistingResource[]): ImportPlanEntry {
    const current = existing.find(
        (each) => each.place === resource.place && each.route === resource.route,
    );

    if (current === undefined) {
        return entry('add', resource, true);
    }

    // A folder carries no origin, and its file holds a name and an order alone. Writing over
    // it loses nothing that belongs to a person, so a folder on the route is an update.
    if (current.place === 'folder' || sameOrigin(current.origin, resource.origin)) {
        return entry('update', resource, !drifted(current));
    }

    return {
        class: 'conflict',
        place: resource.place,
        route: resource.route,
        name: resource.name,
        resource: null,
        selected: false,
    };
}

function removalsOf(
    resources: readonly ImportResource[],
    existing: readonly ExistingResource[],
): ImportPlanEntry[] {
    const unclaimed = existing.filter((current) => !resources.some(claims(current)));

    return unclaimed
        .filter((current) => resources.some((each) => sameOrigin(current.origin, each.origin)))
        .map((current) => ({
            class: 'removal' as const,
            place: current.place,
            route: current.route,
            name: current.name,
            resource: null,
            selected: false,
        }));
}

function claims(current: ExistingResource): (resource: ImportResource) => boolean {
    return (resource) => resource.place === current.place && resource.route === current.route;
}

function entry(
    class_: 'add' | 'update',
    resource: ImportResource,
    selected: boolean,
): ImportPlanEntry {
    return {
        class: class_,
        place: resource.place,
        route: resource.route,
        name: resource.name,
        resource,
        selected,
    };
}

/**
 * The import stored what it wrote; the workspace reads what it holds now. When the two
 * fingerprints disagree, a person edited the item after the import, and the import does not
 * start by writing over their work. No stored fingerprint means there is nothing to compare,
 * and nothing to compare is nothing to fear.
 */
function drifted(current: ExistingResource): boolean {
    return (
        current.origin?.fingerprint !== undefined &&
        current.fingerprint !== current.origin.fingerprint
    );
}

function sameOrigin(left: ItemOrigin | undefined, right: ItemOrigin): boolean {
    return left?.kind === right.kind && left.sourceId === right.sourceId;
}
