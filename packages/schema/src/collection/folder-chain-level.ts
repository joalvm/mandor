import type { AuthPlace } from '../auth/auth-place.js';
import type { FolderSettings } from './folder-settings.js';

/** What a level of the chain hands down: everything its file says but its name and order. */
export type FolderChainSettings = Omit<FolderSettings, 'name' | 'order'>;

/**
 * One level of the chain above an item: a folder or a collection, and the workspace last. The
 * chain is read once per send, so auth and variables come from the same version of disk.
 */
export type FolderChainLevel = {
    /** What the level is, which says where its values rank: the store's table decides it. */
    level: 'collection' | 'folder' | 'workspace';
    place: AuthPlace;
    /** The visible name of the level: what the interface calls it, never its path. */
    name: string;
    settings: FolderChainSettings;
    /** The file of the level could not be read: it enters empty, and the send goes on. */
    unreadable?: true | undefined;
};
