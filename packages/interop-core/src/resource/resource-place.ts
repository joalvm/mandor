/**
 * Where a resource of an import lands. Connections have their own folder, environments theirs;
 * the collection, its folders and its items live in the collections of the workspace, `doc` is
 * one note of the workspace, and `workspace` is the workspace file itself.
 */
export const RESOURCE_PLACES = [
    'collection',
    'connection',
    'doc',
    'environment',
    'folder',
    'globals',
    'item',
    'workspace',
] as const;

export type ResourcePlace = (typeof RESOURCE_PLACES)[number];
