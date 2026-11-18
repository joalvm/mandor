import type { FolderChainLevel } from '@mandor/schema';

/** The values one collection or folder of a chain provides, with the name a person reads. */
export type ChainLevelValues = {
    level: 'collection' | 'folder';
    name: string;
    values: Readonly<Record<string, string>>;
};

/**
 * The active variables of each collection and folder of a chain, in the order of the chain.
 * The workspace closes the chain for its auth and provides no variables through it. Main and
 * the window call this the same way, so neither builds levels by hand.
 */
export function chainValues(chain: readonly FolderChainLevel[]): ChainLevelValues[] {
    return chain.flatMap((link) => {
        if (link.level === 'workspace') {
            return [];
        }

        const active = (link.settings.variables ?? []).filter((variable) => variable.enabled);
        const values = Object.fromEntries(active.map(({ name, value }) => [name, value]));

        return [{ level: link.level, name: link.name, values }];
    });
}
