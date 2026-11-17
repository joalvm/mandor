import type { ImportResource } from '../resource/import-resource.js';
import { claimRoute, type TakenRoutes } from './claim-route.js';
import { nameOr } from './resource-parts.js';

/** Where a walk of a collection is: the file it reads and the ids already taken in each directory. */
export type TreeWalk = { sourceId: string; taken: TakenRoutes };

type TreeNode<Kind extends 'folder' | 'request'> = { kind: Kind; name: string };

/** How a format turns the nodes of its tree into resources; the walk itself is the same. */
export type TreeMakers<Folder extends TreeNode<'folder'>, Request extends TreeNode<'request'>> = {
    request: (node: Request, sourceId: string, route: string) => ImportResource;
    folder: (node: Folder, sourceId: string, route: string) => ImportResource;
    /** What hangs under a folder, by the route the folder took. */
    inside: (folder: Folder, route: string, walk: TreeWalk) => ImportResource[];
};

/** What a node is called when its document left it with no name: the word of its kind. */
const UNNAMED = { folder: 'Folder', request: 'Request' } as const;

/** A folder or a request, with what hangs under it; siblings share a directory, so one id each. */
export function treeResourcesOf<
    Folder extends TreeNode<'folder'>,
    Request extends TreeNode<'request'>,
>(
    node: Folder | Request,
    parent: string,
    walk: TreeWalk,
    makers: TreeMakers<Folder, Request>,
): ImportResource[] {
    const name = nameOr(node.name, UNNAMED[node.kind]);
    const route = claimRoute(walk.taken, parent, name, node.kind);

    if (node.kind === 'request') {
        return [makers.request({ ...node, name }, walk.sourceId, route)];
    }

    return [
        makers.folder({ ...node, name }, walk.sourceId, route),
        ...makers.inside(node, route, walk),
    ];
}
