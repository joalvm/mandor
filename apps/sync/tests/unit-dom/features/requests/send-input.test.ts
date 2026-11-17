import { collectionStore, itemResource } from '@mandor/collections';
import { envStore } from '@mandor/env';
import { createRequestItem, DEFAULT_REQUEST_SETTINGS, formatResourceUri } from '@mandor/schema';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    sendInputOf,
    snippetInputOf,
} from '../../../../src/renderer/features/requests/lib/send-input.js';
import { requestDefaultsStore } from '../../../../src/renderer/features/requests/request-defaults-store.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';

const RESOURCE = itemResource('Local', 'local', 'crear-pedido');
const REQUEST = createRequestItem({ name: 'crear pedido' });

describe('what a send takes from a resource', () => {
    beforeEach(() => {
        requestsStore.getState().reset();
        envStore.getState().reset();
    });

    afterEach(() => {
        requestsStore.getState().reset();
        envStore.getState().reset();
        collectionStore.getState().reset();
        requestDefaultsStore.setState({ defaults: DEFAULT_REQUEST_SETTINGS });
    });

    it('is the request on screen, where it lives and the environment of its workspace', () => {
        requestsStore.getState().setRequest(RESOURCE, REQUEST);
        envStore.setState({ activeEnvironmentIds: { local: 'env-1' } });

        expect(sendInputOf(RESOURCE)).toEqual({
            environmentId: 'env-1',
            itemPath: 'crear-pedido',
            request: { ...REQUEST, settings: DEFAULT_REQUEST_SETTINGS },
            workspaceId: 'local',
        });
    });

    it('goes out with the defaults of the app under what the request kept of its own', () => {
        requestDefaultsStore.getState().setDefaults({
            ...DEFAULT_REQUEST_SETTINGS,
            timeoutMs: 5000,
            validateTls: false,
        });
        requestsStore
            .getState()
            .setRequest(RESOURCE, { ...REQUEST, settings: { validateTls: true } });

        expect(sendInputOf(RESOURCE)?.request.settings).toEqual({
            ...DEFAULT_REQUEST_SETTINGS,
            timeoutMs: 5000,
            validateTls: true,
        });
    });

    /** The code of a request says what it set; a default of the app would read as asked for. */
    it('is written as code with only the settings the request kept of its own', () => {
        requestDefaultsStore
            .getState()
            .setDefaults({ ...DEFAULT_REQUEST_SETTINGS, timeoutMs: 5000 });
        requestsStore
            .getState()
            .setRequest(RESOURCE, { ...REQUEST, settings: { followRedirects: true } });

        expect(snippetInputOf(RESOURCE)?.request.settings).toEqual({ followRedirects: true });
        expect(snippetInputOf(itemResource('Local', 'local', 'nunca-leido'))).toBeNull();
    });

    /** Main names the request where a script of it breaks: with the name the tree shows now. */
    it('goes out with the name the item took after the draft was read', () => {
        requestsStore.getState().setRequest(RESOURCE, REQUEST);
        collectionStore.getState().setNodes([
            {
                kind: 'item',
                itemKind: 'request',
                mark: 'GET',
                name: 'pedido renombrado',
                path: 'crear-pedido',
                tags: [],
            },
        ]);

        expect(sendInputOf(RESOURCE)?.request.name).toBe('pedido renombrado');
        expect(snippetInputOf(RESOURCE)?.request.name).toBe('pedido renombrado');
    });

    it('keeps the name of the draft while the tree does not hold the item', () => {
        requestsStore.getState().setRequest(RESOURCE, REQUEST);

        expect(sendInputOf(RESOURCE)?.request.name).toBe('crear pedido');
    });

    it('goes without an environment when the workspace has none active', () => {
        requestsStore.getState().setRequest(RESOURCE, REQUEST);

        expect(sendInputOf(RESOURCE)?.environmentId).toBeNull();
    });

    it('is nothing for a resource that was never read, or that is not an item', () => {
        expect(sendInputOf(RESOURCE)).toBeNull();
        expect(sendInputOf(formatResourceUri({ name: 'settings', scope: 'app' }))).toBeNull();
    });
});
