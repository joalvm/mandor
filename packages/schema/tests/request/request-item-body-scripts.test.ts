import { describe, expect, it } from 'vitest';

import { createRequestItem } from '../../src/index.js';
import { requestItemBody } from '../../src/request/request-item-body.js';

describe('requestItemBody: imported scripts', () => {
    it('writes the scripts an import brought, and none when it brought none', () => {
        const request = createRequestItem({ name: 'crear pedido' });
        const importedScripts = [
            { event: 'onBeforeRequest', dialect: 'postman', source: 'a()' } as const,
        ];

        expect(requestItemBody({ ...request, importedScripts })['importedScripts']).toEqual(
            importedScripts,
        );
        expect(
            requestItemBody({ ...request, importedScripts: [] })['importedScripts'],
        ).toBeUndefined();
    });
});
