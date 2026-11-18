import type {
    FormatDocument,
    WorkspaceCollectionSource,
    WorkspaceData,
} from '@mandor/interop-core';

import { levelDocumentsOf } from './folder-documents.js';
import { folderSettingsDocumentOf } from './folder-settings-document.js';

const SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

/**
 * One collection of the workspace as a collection of Postman 2.1. The auth of the workspace is
 * the one the collection speaks when it speaks none; the variables of the collection stay in it,
 * and the globals go to their own file. The notes of the collection are its description, under
 * `info` as Postman has it. Messages have no place in Postman and stay out.
 */
export function collectionDocumentOf(
    collection: WorkspaceCollectionSource,
    workspace: Pick<WorkspaceData, 'auth'>,
): FormatDocument {
    const { description } = collection.settings;
    const auth = collection.settings.auth ?? workspace.auth;

    return {
        info: {
            name: collection.name,
            schema: SCHEMA,
            ...(description === undefined ? {} : { description }),
        },
        item: levelDocumentsOf(collection),
        ...folderSettingsDocumentOf({ ...collection.settings, description: undefined, auth }),
    };
}
