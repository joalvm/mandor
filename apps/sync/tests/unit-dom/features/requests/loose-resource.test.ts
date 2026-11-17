import { itemResource } from '@mandor/collections';
import { describe, expect, it } from 'vitest';

import {
    loosePartsOf,
    looseResource,
    looseTabId,
} from '../../../../src/renderer/features/requests/lib/loose-resource.js';
import { requestPartsOf } from '../../../../src/renderer/features/requests/lib/request-parts.js';

const LOOSE = looseResource('Local', 'local', 'a1b2');

describe('a request saved nowhere (loose-resource)', () => {
    it('is named by its workspace and an id nobody chose', () => {
        expect(LOOSE).toBe('mandor://local/local/loose/a1b2');
        expect(loosePartsOf(LOOSE)).toEqual({ id: 'a1b2', workspaceId: 'local' });
    });

    it('is not an item, and an item is not one', () => {
        expect(loosePartsOf(itemResource('Local', 'local', 'pedidos/crear'))).toBeNull();
    });

    it('has one tab, named after it', () => {
        expect(looseTabId('a1b2')).toBe('loose-request-a1b2');
    });
});

describe('where a request lives (request-parts)', () => {
    it('is the path of an item in its collection', () => {
        expect(requestPartsOf(itemResource('Local', 'local', 'pedidos/crear'))).toEqual({
            path: 'pedidos/crear',
            workspaceId: 'local',
        });
    });

    it('is only its workspace for one saved nowhere', () => {
        expect(requestPartsOf(LOOSE)).toEqual({ path: null, workspaceId: 'local' });
    });

    it('is nothing for what is not a request', () => {
        expect(requestPartsOf('mandor://local/local/doc/readme')).toBeNull();
    });
});
