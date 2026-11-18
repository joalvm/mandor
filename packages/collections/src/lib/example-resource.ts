import { formatResourceUri, parseResourceUri, slugify, type ResourceUri } from '@mandor/schema';

/** The resource of one response example: the path of its item, then its key. */
export function exampleResource(
    origin: string,
    workspaceId: string,
    itemPath: string,
    key: string,
): ResourceUri {
    return formatResourceUri({
        scope: 'workspace',
        repo: slugify(origin),
        workspace: workspaceId,
        kind: 'example',
        path: `${itemPath}/${key}`,
    });
}

/** What a resource says of its example, or nothing when it is not the resource of one. */
export function examplePartsOf(
    resource: string,
): { itemPath: string; key: string; workspaceId: string } | null {
    const parts = partsOrNull(resource);

    if (parts?.scope !== 'workspace' || parts.kind !== 'example') {
        return null;
    }

    const slash = parts.path.lastIndexOf('/');

    if (slash === -1) {
        return null;
    }

    return {
        itemPath: parts.path.slice(0, slash),
        key: parts.path.slice(slash + 1),
        workspaceId: parts.workspace,
    };
}

/**
 * Where every example of an item hangs from. The shell moves a resource and everything under
 * `${from}/` with it, so moving this root moves the tabs of all the examples at once.
 */
export function exampleRootOf(itemResourceUri: string): string {
    const parts = partsOrNull(itemResourceUri);

    if (parts?.scope !== 'workspace') {
        return itemResourceUri;
    }

    return formatResourceUri({ ...parts, kind: 'example' });
}

/** The resource of the item an example hangs from, or nothing for a resource that is not one. */
export function exampleItemOf(resource: string): string | null {
    const parts = partsOrNull(resource);
    const example = examplePartsOf(resource);

    if (parts?.scope !== 'workspace' || example === null) {
        return null;
    }

    return formatResourceUri({ ...parts, kind: 'item', path: example.itemPath });
}

function partsOrNull(resource: string): ReturnType<typeof parseResourceUri> | null {
    try {
        return parseResourceUri(resource);
    } catch {
        return null;
    }
}
