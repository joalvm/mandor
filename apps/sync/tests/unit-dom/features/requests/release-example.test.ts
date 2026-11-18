import { exampleResource, itemResource } from '@mandor/collections';
import type { RequestItem } from '@mandor/schema';
import { shellStore } from '@mandor/shell';
import { beforeEach, describe, expect, it } from 'vitest';

import {
    releaseExample,
    releaseRequestItem,
} from '../../../../src/renderer/features/requests/lib/release-example.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const ITEM = itemResource('Local', 'local', 'crear-pedido');
const CREATED = exampleResource('Local', 'local', 'crear-pedido', 'Creado');
const MISSING = exampleResource('Local', 'local', 'crear-pedido', 'Nada');

const REQUEST: RequestItem = {
    body: { type: 'none' },
    examples: [],
    headers: [],
    method: 'GET',
    name: 'crear pedido',
    pathParams: [],
    query: [],
    settings: { followRedirects: true, maxRedirects: 5, timeoutMs: 30000, validateTls: true },
    url: '',
};

function open(resource: string, kind: string): void {
    const shell = shellStore.getState();

    shell.openTab(shell.activeGroupId, { id: `${kind}-${resource}`, kind, resource });
}

function itemIsKnown(): boolean {
    return requestsStore.getState().requests[ITEM] !== undefined;
}

describe('letting go of what a tab of an example read', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
        shellStore.getState().reset();
        requestsStore.getState().beginRead(ITEM);
        requestsStore.getState().finishRead(ITEM, REQUEST);
    });

    it('forgets the draft of the example and the request nobody else looks at', () => {
        open(CREATED, 'request-example');
        requestsStore.getState().setExampleDraft(CREATED, {
            example: { body: '', contentType: '', name: 'Creado', status: '200' },
        });

        releaseExample(CREATED);

        expect(requestsStore.getState().exampleDrafts[CREATED]).toBeUndefined();
        expect(itemIsKnown()).toBe(false);
    });

    it('keeps the request while a sister tab of another example is open', () => {
        open(CREATED, 'request-example');
        open(MISSING, 'request-example');

        releaseExample(CREATED);

        expect(itemIsKnown()).toBe(true);
    });

    it('keeps the request while the tab of the request itself is open', () => {
        open(CREATED, 'request-example');
        open(ITEM, 'item');

        releaseExample(CREATED);

        expect(itemIsKnown()).toBe(true);
    });

    it('lets the resource go that is no example without looking for a request', () => {
        releaseExample(ITEM);

        expect(itemIsKnown()).toBe(false);
    });

    it('the tab of a request keeps what it read while a tab of one of its examples needs it', () => {
        open(CREATED, 'request-example');
        open(ITEM, 'item');

        releaseRequestItem(ITEM);

        expect(itemIsKnown()).toBe(true);
    });

    it('the tab of a request lets go when no tab of an example is open', () => {
        open(ITEM, 'item');

        releaseRequestItem(ITEM);

        expect(itemIsKnown()).toBe(false);
    });
});
