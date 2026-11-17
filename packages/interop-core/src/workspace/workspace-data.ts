import type {
    CollectionItem,
    Connection,
    ConcreteAuth,
    Environment,
    ImportedScript,
    PlainVariable,
    RequestLine,
    RequestScripts,
    Variable,
} from '@mandor/schema';

/**
 * What a collection or a folder declares, never what it inherits: a copy of the inherited in every
 * level could not tell, on the way back, what was said here from what came from above.
 */
export type WorkspaceFolderSettings = {
    /** The words the level says about itself; absent when it says nothing. */
    description?: string | undefined;
    variables: readonly PlainVariable[];
    /** The auth the level decides; absent when unset or `{ inherit: true }`. */
    auth?: ConcreteAuth | undefined;
    headers: readonly RequestLine[];
    /** The scripts another tool left on the level, kept as text; absent when it left none. */
    importedScripts?: readonly ImportedScript[] | undefined;
    /** The scripts the person wrote for the level, one per event; absent when there are none. */
    scripts?: RequestScripts | undefined;
};

/** One folder of a collection: what it declares, the folders inside it and its own items, read. */
export type WorkspaceFolderNode = {
    name: string;
    settings: WorkspaceFolderSettings;
    folders: readonly WorkspaceFolderNode[];
    /** The items the folder itself holds, not the ones of the folders below it. */
    items: readonly CollectionItem[];
    /**
     * Which kind comes next as the person arranged them. Absent: the folders, then the items.
     * Whoever writes a format that keeps the arrangement reads it through `childrenInOrder`.
     */
    sequence?: readonly ('folder' | 'item')[] | undefined;
};

/** One collection of the workspace: the top of a tree, with the same shape as what hangs from it. */
export type WorkspaceCollectionSource = WorkspaceFolderNode;

/**
 * One note of the workspace: the name of its file, the title it is known by and the text in it,
 * exactly as it sits on disk. The title is also in the text, in its front matter; it is kept
 * apart so that whoever reads the workspace need not parse the text to name the note.
 */
export type WorkspaceDoc = {
    name: string;
    title: string;
    text: string;
};

/**
 * The workspace as the turn to IR receives it: data, never paths. Whoever gathers it reads the
 * disk and the store; nothing here knows where the files live, the same bargain the other way
 * keeps with the document that arrives as text.
 */
export type WorkspaceData = {
    /** What the workspace calls itself, as the document will want to when it leaves. */
    name: string;
    connections: readonly Connection[];
    environments: readonly Environment[];
    /**
     * Environments a document says only as servers: a collection never carries an environment, yet
     * the spec it leaves as keeps the address its requests were aimed at. Absent when the
     * environments above speak for themselves.
     */
    serverEnvironments?: readonly Environment[] | undefined;
    /** The workspace's own auth; absent when unset or `{ inherit: true }`. */
    auth?: ConcreteAuth | undefined;
    /**
     * The globals of the origin the workspace lives in, every secret with an empty value: a
     * format with globals carries them as such, one without carries them at its lowest level.
     */
    globals: readonly Variable[];
    /** The notes of the workspace, by the name of their file. */
    docs: readonly WorkspaceDoc[];
    /** The collections of the workspace, one source per collection, in the order of the top level. */
    collections: readonly WorkspaceCollectionSource[];
};
