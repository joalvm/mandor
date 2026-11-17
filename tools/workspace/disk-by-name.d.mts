/** The files of a repo, by path from its root with `/`, wherever they are read from. */
export type Tree = { list(): Promise<string[]>; read(path: string): Promise<string> };

export type NamedWorkspace = { dir: string; name: string };

export function diskTree(repoRoot: string): Tree;
export function bareTree(bare: string, branch?: string): Tree;
export function onDisk(found: string | null, what: string): string;
export function filesIn(tree: Tree, dir: string): Promise<string[]>;
export function workspaces(tree: Tree): Promise<NamedWorkspace[]>;
export function workspaceNamed(tree: Tree, name: string): Promise<string | null>;
export function entityNamed(tree: Tree, dir: string, name: string): Promise<string | null>;
export function holderNamed(
    tree: Tree,
    collectionsDir: string,
    names: readonly string[],
): Promise<string | null>;
export function itemNamed(
    tree: Tree,
    collectionsDir: string,
    names: readonly string[],
): Promise<string | null>;
export function docTitled(tree: Tree, docsDir: string, title: string): Promise<string | null>;
