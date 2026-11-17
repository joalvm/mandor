import type { FormatDocument, WorkspaceFolderSettings } from '@mandor/interop-core';
import type { PlainVariable } from '@mandor/schema';

import { authDocumentOf } from './auth-document.js';
import { scriptEventsOf } from './script-events.js';

function variableRowOf({ name, value, enabled }: PlainVariable): FormatDocument {
    return { key: name, value, type: 'string', ...(enabled ? {} : { disabled: true }) };
}

/**
 * What a level declares in the keys Postman has for it, on the root and on an item-group alike.
 * Postman has no headers at a level: they go down to each request. A key with nothing to say is
 * not written.
 */
export function folderSettingsDocumentOf(settings: WorkspaceFolderSettings): FormatDocument {
    const { description, variables, auth } = settings;
    const events = scriptEventsOf(settings.importedScripts);

    return {
        ...(description === undefined ? {} : { description }),
        ...(variables.length === 0 ? {} : { variable: variables.map(variableRowOf) }),
        ...(auth === undefined ? {} : { auth: authDocumentOf(auth) }),
        ...(events.length === 0 ? {} : { event: events }),
    };
}
