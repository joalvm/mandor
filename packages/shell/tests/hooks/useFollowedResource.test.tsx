import { ROOT_GROUP_ID } from '@mandor/ipc';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useFollowedResource } from '../../src/hooks/useFollowedResource.js';
import { shellStore } from '../../src/shell-store.js';
import { declareTabKindSpec } from '../../src/testing/tab-kind.js';

const DOC = 'mandor://demo/events/doc/readme.md';
const CONNECTION = 'mandor://demo/events/connection/echo';
const MESSAGE = 'mandor://demo/events/item/pedidos/pagado.yaml';

/** What the connection composes, as the kind of the test tells it to whoever listens. */
let composed: string | null = null;
const listeners = new Set<() => void>();

function compose(resource: string | null): void {
    composed = resource;

    for (const listener of listeners) {
        listener();
    }
}

const stops: (() => void)[] = [];

beforeEach(() => {
    composed = null;
    listeners.clear();
    shellStore.getState().reset();
    stops.push(
        declareTabKindSpec({ closable: true, icon: 'doc', id: 'doc', title: () => 'Doc' }),
        declareTabKindSpec({
            closable: true,
            icon: 'connection',
            id: 'connection',
            inside: () => composed,
            subscribeInside: (onChange) => {
                listeners.add(onChange);

                return () => {
                    listeners.delete(onChange);
                };
            },
            title: () => 'Echo',
        }),
    );
});

afterEach(() => {
    // The hook goes first: letting its kinds go under it is an update outside act.
    cleanup();

    for (const stop of stops.splice(0)) {
        stop();
    }

    shellStore.getState().reset();
});

describe('what the lateral follows', () => {
    it('follows nothing while no tab is open', () => {
        const { result } = renderHook(() => useFollowedResource());

        expect(result.current).toBeNull();
    });

    it('follows what the tab in front looks at, when its kind holds nothing inside', () => {
        const { result } = renderHook(() => useFollowedResource());

        act(() => {
            shellStore
                .getState()
                .openTab(ROOT_GROUP_ID, { id: 'readme', kind: 'doc', resource: DOC });
        });

        expect(result.current).toBe(DOC);
    });

    /** A connection tab is the connection; the message its composer holds is what the tree lists. */
    it('follows what the tab in front has open inside it, and again when that changes', () => {
        const { result } = renderHook(() => useFollowedResource());

        act(() => {
            shellStore
                .getState()
                .openTab(ROOT_GROUP_ID, { id: 'echo', kind: 'connection', resource: CONNECTION });
        });

        expect(result.current).toBe(CONNECTION);

        act(() => {
            compose(MESSAGE);
        });

        expect(result.current).toBe(MESSAGE);

        act(() => {
            shellStore
                .getState()
                .openTab(ROOT_GROUP_ID, { id: 'readme', kind: 'doc', resource: DOC });
        });

        expect(result.current).toBe(DOC);
    });
});
