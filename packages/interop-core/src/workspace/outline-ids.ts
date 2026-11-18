import type { Connection, Environment } from '@mandor/schema';

import type { WorkspaceDoc } from './workspace-data.js';

/**
 * The routes a node is known by. They name a place in the data the outline was read from, and
 * the write reads the same data again: nothing else holds them together.
 */
export function connectionId(connection: Connection): string {
    return `connection/${connection.id}`;
}

export function environmentId(environment: Environment): string {
    return `environment/${environment.id}`;
}

/** The auth and the variables of the workspace file travel as one node: they are its settings. */
export const SETTINGS_ID = 'settings';

export function docId(doc: WorkspaceDoc): string {
    return `doc/${doc.name}`;
}

export function collectionId(index: number): string {
    return `collection/${String(index)}`;
}

/** A folder by its way down from its collection: two at any depth never share a route. */
export function folderId(holder: string, index: number): string {
    return `${holder}/folder/${String(index)}`;
}

export function itemId(holder: string, index: number): string {
    return `${holder}/item/${String(index)}`;
}
