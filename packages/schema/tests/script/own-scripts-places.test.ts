import { describe, expect, it } from 'vitest';

import { folderSettingsSchema } from '../../src/collection/folder-settings-schema.js';
import { connectionSchema } from '../../src/connection/connection-schema.js';
import { requestItemSchema } from '../../src/request/request-item-schema.js';
import { createRequestItem } from '../../src/request/create-request-item.js';
import { requestItemBody } from '../../src/request/request-item-body.js';

const SCRIPTS = { onBeforeRequest: { source: "vars.set('a', 1);\n" } };

describe('where the own scripts live', () => {
    it('are in a request, apart from the scripts an import brought', () => {
        const imported = [{ event: 'onResponse', dialect: 'postman', source: 'pm.x()' }];
        const parsed = requestItemSchema.parse({
            name: 'a',
            scripts: SCRIPTS,
            importedScripts: imported,
        });

        expect(parsed.scripts).toEqual(SCRIPTS);
        expect(parsed.importedScripts).toEqual(imported);
        expect(requestItemSchema.parse({ name: 'a' }).scripts).toBeUndefined();
    });

    it('are written by a request under their own key, and the key leaves when they are empty', () => {
        const request = createRequestItem({ name: 'a' });

        expect(requestItemBody({ ...request, scripts: SCRIPTS })['scripts']).toEqual(SCRIPTS);
        expect(requestItemBody({ ...request, scripts: {} })['scripts']).toBeUndefined();
        expect(requestItemBody(request)['scripts']).toBeUndefined();
    });

    it('are in the settings of a collection or a folder', () => {
        expect(folderSettingsSchema.parse({ name: 'Pagos', scripts: SCRIPTS }).scripts).toEqual(
            SCRIPTS,
        );
        expect(folderSettingsSchema.parse({ name: 'Pagos' }).scripts).toBeUndefined();
    });

    it('are in a connection, with the events of a connection', () => {
        const scripts = { onConnect: { source: 'socket.send("hi")' } };
        const parsed = connectionSchema.parse({
            id: 'gateway',
            name: 'Gateway',
            url: 'wss://example.com/socket',
            headers: [],
            environmentId: null,
            scripts,
        });

        expect(parsed).toMatchObject({ scripts });
    });
});
