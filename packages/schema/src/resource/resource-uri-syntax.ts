/** The fixed words of the resource grammar. Everything else in a URI is a name the user chose. */
export const RESOURCE_URI_SCHEME = 'mandor://';

/**
 * The host of a resource that belongs to the window and not to a repo: the settings of the app
 * exist before any repo is open. An underscore is unreachable for a repo host, which is one id
 * segment, so this host can never collide with a repo the user named.
 */
export const APP_HOST = '_app';

/** The one resource a repo owns outside of its workspaces. */
export const SETTINGS_PATH = 'settings';

/**
 * Runtime values for what a workspace resource is: the third segment of its URI. A `loose` one is
 * a request of the workspace saved nowhere yet: it lives in the window, and its path is an id.
 */
export const RESOURCE_KINDS = [
    'conflict',
    'connection',
    'doc',
    'environment',
    'example',
    'folder',
    'history',
    'item',
    'loose',
] as const;

/** What a workspace resource is. Anything else in that position is a URI that names nothing. */
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
