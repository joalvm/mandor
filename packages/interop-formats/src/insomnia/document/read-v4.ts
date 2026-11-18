import { documentSourceId } from './document-source-id.js';
import { InsomniaParseError } from './insomnia-parse-error.js';
import type {
    InsomniaDocument,
    InsomniaEnvironment,
    InsomniaNode,
    InsomniaSkipped,
} from './insomnia-tree.js';
import {
    insomniaV4Schema,
    type InsomniaNodeParts,
    type InsomniaV4Resource,
} from './insomnia-v4-schema.js';
import { environmentOf, folderOf, requestOf, websocketOf } from './node-of.js';

/** The types of the list that are a request of some protocol; HTTP and WebSocket are the ones read. */
const REQUEST_SUFFIX = '_request';

type Resources = {
    byParent: Map<string, InsomniaV4Resource[]>;
    skipped: InsomniaSkipped[];
};

function bySortKey(first: InsomniaV4Resource, second: InsomniaV4Resource): number {
    return (first.metaSortKey ?? 0) - (second.metaSortKey ?? 0);
}

function indexed(resources: readonly InsomniaV4Resource[]): Map<string, InsomniaV4Resource[]> {
    const byParent = new Map<string, InsomniaV4Resource[]>();

    for (const resource of resources) {
        const siblings = byParent.get(resource.parentId ?? '') ?? [];

        siblings.push(resource);
        byParent.set(resource.parentId ?? '', siblings);
    }

    return byParent;
}

/** The children of a workspace or a folder, in the order Insomnia shows them. */
function childrenOf(parentId: string, resources: Resources): InsomniaNode[] {
    const siblings = [...(resources.byParent.get(parentId) ?? [])].sort(bySortKey);

    return siblings.flatMap((resource) => nodeOf(resource, resources));
}

/** A resource with what version 4 writes flat where version 5 nests it, so one reader serves both. */
function partsOf(resource: InsomniaV4Resource): InsomniaNodeParts {
    return {
        ...resource,
        scripts: {
            preRequest: resource.preRequestScript,
            afterResponse: resource.afterResponseScript,
        },
        settings: {
            followRedirects: resource.settingFollowRedirects,
            encodeUrl: resource.settingEncodeUrl,
            rebuildPath: resource.settingRebuildPath,
            renderRequestBody: resource.settingRenderRequestBody,
            cookies: { send: resource.settingSendCookies, store: resource.settingStoreCookies },
        },
    };
}

/** The types of the list that become a node of the tree. */
const NODES = new Map<
    string,
    (resource: InsomniaV4Resource, resources: Resources) => InsomniaNode[]
>([
    ['request', (resource) => [requestOf(partsOf(resource), resource.description ?? '')]],
    ['websocket_request', (resource) => [websocketOf(resource, resource.description ?? '')]],
    [
        'request_group',
        (resource, resources) => [
            folderOf(
                partsOf(resource),
                resource.description ?? '',
                childrenOf(resource._id, resources),
            ),
        ],
    ],
]);

function nodeOf(resource: InsomniaV4Resource, resources: Resources): InsomniaNode[] {
    const read = NODES.get(resource._type);

    if (read !== undefined) {
        return read(resource, resources);
    }

    if (resource._type.endsWith(REQUEST_SUFFIX)) {
        resources.skipped.push({ kind: resource._type, name: resource.name ?? '' });
    }

    return [];
}

function environmentsUnder(
    parentId: string,
    byParent: Map<string, InsomniaV4Resource[]>,
): InsomniaV4Resource[] {
    return (byParent.get(parentId) ?? []).filter((resource) => resource._type === 'environment');
}

/** The base environment hangs from the workspace; the ones that hang from it are the sub ones. */
function environmentsOf(
    workspaceId: string,
    byParent: Map<string, InsomniaV4Resource[]>,
): Pick<InsomniaDocument, 'base' | 'environments'> {
    const [first, ...others] = environmentsUnder(workspaceId, byParent);
    const under = first === undefined ? [] : environmentsUnder(first._id, byParent);
    const environment = (resource: InsomniaV4Resource): InsomniaEnvironment =>
        environmentOf(resource.name, resource.data);

    return {
        base: first === undefined ? undefined : environment(first),
        environments: [...under, ...others].sort(bySortKey).map(environment),
    };
}

/**
 * The collections of a v4 export: one per workspace of the flat list, each rebuilt as the tree
 * the `parentId`s describe. An export of the whole app brings several.
 */
export function readV4(root: unknown): InsomniaDocument[] {
    const parsed = insomniaV4Schema.safeParse(root);

    if (!parsed.success) {
        throw new InsomniaParseError(
            parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
        );
    }

    const { resources } = parsed.data;
    const workspaces = resources.filter((resource) => resource._type === 'workspace');
    const byParent = indexed(resources);

    if (workspaces.length === 0) {
        throw new InsomniaParseError(['The export has no workspace']);
    }

    return workspaces.map((workspace) => {
        const own: Resources = { byParent, skipped: [] };
        const name = workspace.name ?? '';

        return {
            sourceId: documentSourceId(workspace._id, name),
            name,
            description: workspace.description ?? '',
            children: childrenOf(workspace._id, own),
            skipped: own.skipped,
            ...environmentsOf(workspace._id, byParent),
        };
    });
}
