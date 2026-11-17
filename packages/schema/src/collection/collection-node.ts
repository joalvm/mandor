/** What every node of the tree carries: where it is, and what to call it on screen. */
type CollectionNodeBase = {
    /** Path inside the collection, `/` separated and without extension. This is the identity. */
    path: string;
    name: string;
};

/**
 * One collection: the top of a set that arrived whole, by hand or by import, and keeps its
 * children arranged in its own file.
 */
export type CollectionSetNode = CollectionNodeBase & {
    kind: 'collection';
    /** What the collection says about itself; absent when it says nothing. */
    description?: string | undefined;
    children: CollectionNode[];
};

export type CollectionFolderNode = CollectionNodeBase & {
    kind: 'folder';
    children: CollectionNode[];
};

/** What the tree says of an example of an item without opening the file. */
export type CollectionItemExample = {
    /** The name made safe to be the last segment of the resource of the example. */
    key: string;
    name: string;
    /** The status code of the example, so its row can wear it. */
    mark?: string | undefined;
};

export type CollectionItemNode = CollectionNodeBase & {
    kind: 'item';
    /** What the item is, so the app can pick the renderer it registered for that kind. */
    itemKind: string;
    /** The short word the item wears beside its name, such as the method of a request. */
    mark?: string | undefined;
    /** The responses the item shows under it; absent when it has none, never an empty list. */
    examples?: CollectionItemExample[] | undefined;
    tags: string[];
};

/**
 * The collection as the lateral draws it: names, order and structure, and no bodies. Opening an
 * item reads its file; listing a workspace of a thousand items must not.
 */
export type CollectionNode = CollectionSetNode | CollectionFolderNode | CollectionItemNode;
