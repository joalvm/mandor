import {
    slugify,
    type AuthConfig,
    type ItemOrigin,
    type RequestLine,
    type RequestScripts,
    type Variable,
} from '@mandor/schema';

import { collectionFingerprint } from './collection-fingerprint.js';
import type { ImportResource } from './import-resource.js';

/** The collection an import arrives as: the document itself, named and described as it said. */
export type CollectionOfDocument = {
    name: string;
    description?: string | undefined;
    /** The auth the collection asks of its own requests; none leaves the key out. */
    auth?: AuthConfig | undefined;
    /** The base values of the API the collection speaks: what the active environment overrides. */
    variables?: readonly Variable[] | undefined;
    /** The lines every request below sends. */
    headers?: readonly RequestLine[] | undefined;
    /** The scripts of the collection, one per event, as they came and not yet approved. */
    scripts?: RequestScripts | undefined;
    origin: ItemOrigin;
};

/** The route of a collection whose name keeps no letter a route can hold. */
const FALLBACK_ROUTE = 'collection';

/**
 * The collection resource every mapper emits first: the document lands as one collection, and
 * everything else it carries files inside it. Its route is the slug of its name, unique at the
 * top level because the import claims it before any sibling speaks; the plan moves it beside a
 * collection that already holds it. Its fingerprint covers the name and every setting.
 */
export function collectionResourceOf(collection: CollectionOfDocument): ImportResource {
    const fields: Record<string, unknown> = {
        name: collection.name,
        ...broughtOnly('description', collection.description),
        ...broughtOnly('auth', collection.auth),
        ...broughtOnly('variables', collection.variables),
        ...broughtOnly('headers', collection.headers),
        ...broughtOnly('scripts', collection.scripts),
    };

    return {
        place: 'collection',
        itemKind: null,
        route: routeOf(collection.name),
        name: collection.name,
        fields,
        origin: {
            ...collection.origin,
            fingerprint: collectionFingerprint(collection),
        },
        degradations: [],
    };
}

/** A field the document brought, or nothing: the file keeps no key for an empty list or map. */
function broughtOnly(key: string, value: unknown): Record<string, unknown> {
    const empty = typeof value === 'object' && value !== null && Object.keys(value).length === 0;

    return value === undefined || empty ? {} : { [key]: value };
}

/** `slugify` throws only for a name with nothing a route can keep, and that name still enters. */
function routeOf(name: string): string {
    try {
        return slugify(name);
    } catch {
        return FALLBACK_ROUTE;
    }
}

/** The route of everything that files inside the collection: its slug, then the local route. */
export function underCollection(collectionRoute: string, route: string): string {
    return route === '' ? collectionRoute : `${collectionRoute}/${route}`;
}
