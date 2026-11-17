/**
 * The levels a name resolves against. The order of the list is the whole contract: the first
 * level holding the name wins. Composing the list from script values, the folders of an item,
 * the active environment, its collection, the globals of the origin and the dynamic ones is a
 * separate concern.
 */
export type ScopeLevelName =
    'script' | 'folder' | 'environment' | 'collection' | 'globals' | 'dynamic';

type ScopeLevel = {
    name: ScopeLevelName;
    /** The visible name of a collection or folder level: what a person reads, never a path. */
    label?: string;
    values: Readonly<Record<string, string>>;
    /**
     * Names of this level the user declared secret. Optional because a scope written by hand
     * in a test declares no secret; composing one always fills it, empty when there is none.
     */
    secret?: readonly string[];
};

/** The input of a resolution: levels ordered from strongest to weakest. */
export type VariableScope = readonly ScopeLevel[];
