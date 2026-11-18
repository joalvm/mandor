import {
    collectionResourceOf,
    type ImportResource,
    type InteropDocument,
    type InteropOperation,
    type InteropScope,
    underCollection,
} from '@mandor/interop-core';

import { environmentResourcesOf } from './environment-resources.js';
import { type RequestContext, requestResourceOf } from './request-resource.js';
import { routeOf } from './route-of.js';
import { scopeRulesOf } from './scope-rules.js';
import { workspaceResourceOf } from './workspace-auth.js';

/**
 * The whole document as the resources a workspace holds: the auth of the workspace file, one
 * environment per server, one folder per tag an operation opens with, in the order the document
 * declares them, and one request per operation. An operation with no tag sits at the top of the
 * collection. The scope says what a
 * request leans on above it: the environment and the auth of the workspace, or the server of the
 * document and its own auth. Cutting what the scope does not cover is the pipeline's, not the format's.
 */
export function importResourcesOf(
    document: InteropDocument,
    scope: InteropScope,
): ImportResource[] {
    const workspace = workspaceResourceOf(document);
    const collection = collectionResourceOf({
        name: document.name,
        origin: { kind: 'openapi', sourceId: document.sourceId },
    });
    const folders = foldersOf(document, collection.route);
    const taken = new Map<string, Set<string>>([
        ['', new Set([collection.route])],
        // The slugs the folders took inside the collection, so a request with no tag that lands
        // beside them cannot take the segment of a directory that is already there.
        [
            collection.route,
            new Set(
                [...folders.values()].map((folder) =>
                    folder.route.slice(collection.route.length + 1),
                ),
            ),
        ],
    ]);
    const top = collection.route;
    const rules = scopeRulesOf(scope);
    const context = {
        sourceId: document.sourceId,
        security: document.security,
        workspaceScheme: rules.inheritedScheme(document),
        defaultSecurity: document.defaultSecurity,
        base: rules.base(document),
    };
    const items = document.operations.flatMap((operation) =>
        operation.http === undefined
            ? []
            : [
                  requestResourceOf(
                      operation,
                      operation.http,
                      routed(operation, { context, folders, taken, top }),
                  ),
              ],
    );

    return [
        ...(workspace === undefined ? [] : [workspace]),
        ...environmentResourcesOf(document),
        collection,
        ...folders.values(),
        ...items,
    ];
}

/** The tag a request is filed under: the first one the operation names. */
function tagOf(operation: InteropOperation): string | undefined {
    return operation.http?.tags.find((tag) => tag.trim() !== '');
}

/** The tags that open a folder: the ones the document declares first, then the rest as they come. */
function tagsInOrder(document: InteropDocument): string[] {
    const used = new Set(
        document.operations.flatMap((operation) => {
            const tag = tagOf(operation);

            return tag === undefined ? [] : [tag];
        }),
    );
    const declared = (document.groups ?? []).flatMap((group) => group.path);

    return [...new Set([...declared.filter((tag) => used.has(tag)), ...used])];
}

function foldersOf(document: InteropDocument, collection: string): Map<string, ImportResource> {
    const folders = new Map<string, ImportResource>();

    for (const tag of tagsInOrder(document)) {
        const route = underCollection(
            collection,
            routeOf(
                tag,
                [...folders.values()].map((folder) => folder.name),
            ),
        );
        const description = document.groups?.find((group) => group.path[0] === tag)?.description;

        folders.set(tag, {
            place: 'folder',
            itemKind: null,
            route,
            name: tag,
            fields: { name: tag, ...(description === undefined ? {} : { description }) },
            origin: { kind: 'openapi', sourceId: document.sourceId },
            degradations: [],
        });
    }

    return folders;
}

/** The route of a request: its folder and the name it takes there, free of its neighbours'. */
function routed(
    operation: InteropOperation,
    { context, folders, taken, top }: Routing,
): RequestContext {
    const tag = tagOf(operation);
    const folder = tag === undefined ? undefined : folders.get(tag);
    const parent = folder?.route ?? top;
    const used = taken.get(parent) ?? new Set<string>();
    const slug = routeOf(operation.name, [...used]);

    used.add(slug);
    taken.set(parent, used);

    // The top is the collection's own route, so a request never files at the document root:
    // without a tag it goes straight inside the collection, which is the only root there is.
    return { ...context, route: `${parent}/${slug}` };
}

type Routing = {
    context: Omit<RequestContext, 'route'>;
    folders: Map<string, ImportResource>;
    taken: Map<string, Set<string>>;
    top: string;
};
