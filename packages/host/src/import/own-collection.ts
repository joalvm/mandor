import { collectionFingerprint, folderFingerprint } from '@mandor/interop-core';
import type {
    AuthConfig,
    ConcreteAuth,
    RequestLine,
    RequestScripts,
    Variable,
} from '@mandor/schema';

/** What an import owns of a collection or a folder, as its file holds it. */
export type OwnedSettings = {
    description?: string | undefined;
    auth?: AuthConfig | undefined;
    variables?: readonly Variable[] | undefined;
    headers?: readonly RequestLine[] | undefined;
    scripts?: RequestScripts | undefined;
};

/** `inherit` is the default of a level: it is no auth, and the import has none to own. */
export function ownAuthOf(auth: AuthConfig | undefined): ConcreteAuth | undefined {
    return auth === undefined || 'inherit' in auth ? undefined : auth;
}

/**
 * The hash of what an import owns of a collection: its name and every setting. The claim an import
 * writes and the hash the next import reads back are this one, so they agree while nobody touches
 * the file.
 */
export function ownFingerprint(collection: OwnedSettings & { name: string }): string {
    return collectionFingerprint({ ...collection, auth: ownAuthOf(collection.auth) });
}

/** The same for a folder, whose name is the person's to change. */
export function ownFolderFingerprint(folder: OwnedSettings): string {
    return folderFingerprint({ ...folder, auth: ownAuthOf(folder.auth) });
}
