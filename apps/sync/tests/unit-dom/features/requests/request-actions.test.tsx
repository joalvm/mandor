import { collectionStore, itemResource } from '@mandor/collections';
import type { CollectionNode } from '@mandor/schema';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RequestActions } from '../../../../src/renderer/features/requests/components/bar/RequestActions.js';
import { AppProviders } from '../../support/app-providers.js';

const ITEM: CollectionNode = {
    kind: 'item',
    itemKind: 'request',
    name: 'Crear pedido',
    path: 'crear-pedido',
    tags: [],
};

const SAVED = itemResource('local', 'tienda', ITEM.path);

const LOOSE = itemResource('local', 'tienda', 'suelto');

beforeEach(() => {
    collectionStore.getState().reset();
    collectionStore.getState().setNodes([ITEM]);
});

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();
    collectionStore.getState().reset();
});

describe('what is done with the request as a whole', () => {
    it('opens the request as code', () => {
        const onOpenCode = vi.fn();

        render(<RequestActions onKeep={undefined} onOpenCode={onOpenCode} resource={SAVED} />, {
            wrapper: AppProviders,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Code' }));

        expect(onOpenCode).toHaveBeenCalledOnce();
    });

    it('offers to keep the answer only once there is one', () => {
        const onKeep = vi.fn();

        render(<RequestActions onKeep={undefined} onOpenCode={vi.fn()} resource={SAVED} />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('button', { name: 'Save response as example' })).toBeNull();

        cleanup();
        render(<RequestActions onKeep={onKeep} onOpenCode={vi.fn()} resource={SAVED} />, {
            wrapper: AppProviders,
        });
        fireEvent.click(screen.getByRole('button', { name: 'Save response as example' }));

        expect(onKeep).toHaveBeenCalledOnce();
    });

    /** The menu of its row in the tree, for a request the collection holds. */
    it('offers the more actions of a request that is saved', () => {
        render(<RequestActions onKeep={undefined} onOpenCode={vi.fn()} resource={SAVED} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('button', { name: 'More actions' })).toBeVisible();
    });

    it('offers no more actions for a request saved nowhere', () => {
        render(<RequestActions onKeep={undefined} onOpenCode={vi.fn()} resource={LOOSE} />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
    });
});
