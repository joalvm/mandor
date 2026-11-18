import type { AuthChainLevel, FolderChainLevel } from '@mandor/schema';

/** The chain main answers, built from the auth of each level as a test writes it. */
export function folderChainOf(levels: readonly AuthChainLevel[]): FolderChainLevel[] {
    return levels.map(({ place, name, auth }) => ({
        level: place.kind === 'workspace' ? 'workspace' : 'folder',
        place,
        name,
        settings: auth === undefined ? {} : { auth },
    }));
}
