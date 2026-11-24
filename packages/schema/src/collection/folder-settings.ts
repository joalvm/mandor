import type { AuthConfig } from '../auth/auth-config.js';
import type { PlainVariable } from '../environment/plain-variable-schema.js';
import type { RequestLine } from '../request/request-line.js';
import type { RequestScripts } from '../script/own-scripts.js';
import type { ItemOrigin } from './item-origin.js';

/** A collection or a folder as its file keeps it. */
export type FolderSettings = {
    name: string;
    /** Names of the children, without extension. Reordering three siblings touches this alone. */
    order: string[];
    /** The words the group says about itself. */
    description?: string | undefined;
    /**
     * Values the items below resolve `{{name}}` with: the closest folder wins, and the active
     * environment overrides a collection's. Never secret: the file goes to git.
     */
    variables?: PlainVariable[] | undefined;
    /** The auth the items below inherit from. Absent is the same as `{ inherit: true }`. */
    auth?: AuthConfig | undefined;
    /**
     * Headers the requests below send. They add up level by level; by name, whatever the case, the
     * closest level wins and a request's own line wins over all. A disabled line does not count.
     */
    headers?: RequestLine[] | undefined;
    /**
     * What an import wrote in the group and whose it is. Without an origin, what the group holds
     * belongs to whoever set it by hand.
     */
    importOrigin?: ItemOrigin | undefined;
    /** The scripts the user wrote for the group, one per event. Absent until somebody writes one. */
    scripts?: RequestScripts | undefined;
};
