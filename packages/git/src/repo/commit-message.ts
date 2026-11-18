/**
 * What the app did, in the terms the history should read in. The message is built here and
 * not by the caller so the log stays stable: the same change always reads the same way, and
 * a reader of `git log` can tell what Mandor did without opening the diff.
 */
export type RepoChange =
    | { kind: 'init-repo' }
    | { kind: 'empty-repo' }
    | { kind: 'create-workspace'; name: string }
    | { kind: 'rename-workspace'; name: string }
    | { kind: 'delete-workspace'; name: string }
    | { kind: 'create-connection'; name: string }
    | { kind: 'update-connection'; name: string }
    | { kind: 'delete-connection'; name: string }
    | { kind: 'create-environment'; name: string }
    | { kind: 'update-environment'; name: string }
    | { kind: 'update-globals' }
    | { kind: 'set-default-environment'; name: string }
    | { kind: 'delete-environment'; name: string }
    | { kind: 'import-document'; name: string }
    | { kind: 'create-item'; name: string }
    | { kind: 'update-item'; name: string }
    | { kind: 'rename-item'; name: string }
    | { kind: 'move-item'; name: string; to: string }
    | { kind: 'delete-item'; name: string }
    | { kind: 'create-folder'; name: string }
    | { kind: 'rename-folder'; name: string }
    | { kind: 'move-folder'; name: string; to: string }
    | { kind: 'delete-folder'; name: string }
    | { kind: 'reorder-folder'; name: string }
    | { kind: 'update-folder'; name: string }
    | { kind: 'create-doc'; name: string }
    | { kind: 'update-doc'; name: string }
    | { kind: 'rename-doc'; name: string }
    | { kind: 'delete-doc'; name: string }
    | { kind: 'update-auth'; name: string }
    | { kind: 'merge-origin'; name: string }
    | { kind: 'resolve-conflict'; name: string }
    | { kind: 'migrate-format' }
    | { kind: 'untrack-private' }
    | { kind: 'outside-edit'; path: string };

/**
 * A name the file does not carry reads as `unnamed`: the subject never goes blank, and never
 * falls back to the file the name should have come from.
 */
function named(text: string): string {
    return text === '' ? 'unnamed' : text;
}

/**
 * English, present tense, no punctuation: the shape every commit of Mandor has. One builder
 * per kind, and no branch anywhere — a change names itself through the table and nothing
 * decides on the way out.
 */
const BUILDERS: {
    [Kind in RepoChange['kind']]: (change: Extract<RepoChange, { kind: Kind }>) => string;
} = {
    'init-repo': () => 'init repo',
    'empty-repo': () => 'empty repo',
    'create-workspace': (change) => `create workspace ${named(change.name)}`,
    'rename-workspace': (change) => `rename workspace ${named(change.name)}`,
    'delete-workspace': (change) => `delete workspace ${named(change.name)}`,
    'create-connection': (change) => `create connection ${named(change.name)}`,
    'update-connection': (change) => `update connection ${named(change.name)}`,
    'delete-connection': (change) => `delete connection ${named(change.name)}`,
    'create-environment': (change) => `create environment ${named(change.name)}`,
    'update-environment': (change) => `update environment ${named(change.name)}`,
    'update-globals': () => 'update globals',
    'set-default-environment': (change) =>
        `set the default environment of workspace ${named(change.name)}`,
    'delete-environment': (change) => `delete environment ${named(change.name)}`,
    'import-document': (change) => `import document ${named(change.name)}`,
    'create-item': (change) => `create item ${named(change.name)}`,
    'update-item': (change) => `update item ${named(change.name)}`,
    'rename-item': (change) => `rename item ${named(change.name)}`,
    'move-item': (change) => `move item ${named(change.name)} to ${named(change.to)}`,
    'delete-item': (change) => `delete item ${named(change.name)}`,
    'create-folder': (change) => `create folder ${named(change.name)}`,
    'rename-folder': (change) => `rename folder ${named(change.name)}`,
    'move-folder': (change) => `move folder ${named(change.name)} to ${named(change.to)}`,
    'delete-folder': (change) => `delete folder ${named(change.name)}`,
    'reorder-folder': (change) => `reorder folder ${named(change.name)}`,
    'update-folder': (change) => `update folder ${named(change.name)}`,
    'create-doc': (change) => `create doc ${named(change.name)}`,
    'update-doc': (change) => `update doc ${named(change.name)}`,
    'rename-doc': (change) => `rename doc ${named(change.name)}`,
    'delete-doc': (change) => `delete doc ${named(change.name)}`,
    'update-auth': (change) => `update auth ${named(change.name)}`,
    'merge-origin': (change) => `merge changes of ${named(change.name)}`,
    'resolve-conflict': (change) => `resolve conflict in ${named(change.name)}`,
    'migrate-format': () => 'migrate repo format',
    'untrack-private': () => 'untrack private files',
    'outside-edit': (change) => `update ${change.path}`,
};

/** The subject the history keeps for one change. */
export function commitMessage(change: RepoChange): string {
    return messageBy(change.kind, change);
}

/** The kind and the change travel apart, so the compiler pairs the builder with its own change. */
function messageBy<Kind extends RepoChange['kind']>(
    kind: Kind,
    change: Extract<RepoChange, { kind: Kind }>,
): string {
    return BUILDERS[kind](change);
}
