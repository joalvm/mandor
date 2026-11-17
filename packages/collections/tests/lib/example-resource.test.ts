import { describe, expect, it } from 'vitest';

import {
    exampleItemOf,
    examplePartsOf,
    exampleResource,
    exampleRootOf,
} from '../../src/lib/example-resource.js';
import { itemResource } from '../../src/lib/item-resource.js';

describe('the resource of a response example', () => {
    it('names the item path and the key under the kind example', () => {
        expect(exampleResource('Local APIs', 'events', 'acceso/login', 'Creado')).toBe(
            'mandor://local-apis/events/example/acceso/login/Creado',
        );
    });

    it('is taken apart into the workspace, the item path and the key', () => {
        const resource = exampleResource('Local APIs', 'events', 'acceso/login', 'Creado (2)');

        expect(examplePartsOf(resource)).toEqual({
            workspaceId: 'events',
            itemPath: 'acceso/login',
            key: 'Creado (2)',
        });
    });

    it('is nothing for the resource of an item, of a thing that is not a resource, or of a bare key', () => {
        expect(examplePartsOf(itemResource('Local APIs', 'events', 'acceso/login'))).toBeNull();
        expect(examplePartsOf('not a resource')).toBeNull();
        expect(examplePartsOf('mandor://local-apis/events/example/login')).toBeNull();
    });

    it('has a root that every example of the item hangs from', () => {
        const root = exampleRootOf(itemResource('Local APIs', 'events', 'acceso/login'));

        expect(root).toBe('mandor://local-apis/events/example/acceso/login');
        expect(exampleResource('Local APIs', 'events', 'acceso/login', 'Creado')).toContain(
            `${root}/`,
        );
    });

    it('goes back from an example to the item it hangs from', () => {
        const resource = exampleResource('Local APIs', 'events', 'acceso/login', 'Creado');

        expect(exampleItemOf(resource)).toBe(itemResource('Local APIs', 'events', 'acceso/login'));
        expect(exampleItemOf(itemResource('Local APIs', 'events', 'acceso/login'))).toBeNull();
    });
});
