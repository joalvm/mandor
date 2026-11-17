import { ROOT_GROUP_ID } from '@mandor/ipc';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { selectSection, shellStore, useResourceSection } from '../src/index.js';

const RESOURCE = 'mandor://demo/events/item/pedido-creado';

function openTab(id: string, groupId: string = ROOT_GROUP_ID): void {
    shellStore.getState().openTab(groupId, { id, kind: 'item', resource: RESOURCE });
}

beforeEach(() => {
    shellStore.getState().reset();
});

afterEach(() => {
    // The hooks go first: resetting the store under a mounted hook is an update outside act.
    cleanup();
    shellStore.getState().reset();
});

describe('the section a resource was left on', () => {
    /** Two strips over one item are one item: coming back to it lands where it was left. */
    it('answers with the section that was chosen for the resource', () => {
        shellStore.getState().setSection(RESOURCE, 'description');

        expect(selectSection(shellStore.getState(), RESOURCE)).toBe('description');
    });

    it('answers with nothing for a resource nobody chose a section for', () => {
        expect(selectSection(shellStore.getState(), RESOURCE)).toBeNull();
    });

    /** It is view state of what is open. Nothing that is closed keeps a say in how it reopens. */
    it('forgets it with the last tab that was looking at the resource', () => {
        openTab('alpha');
        shellStore.getState().setSection(RESOURCE, 'description');
        shellStore.getState().closeTab(ROOT_GROUP_ID, 'alpha');

        expect(selectSection(shellStore.getState(), RESOURCE)).toBeNull();
    });

    it('keeps it while another tab is still looking at the resource', () => {
        openTab('alpha');

        const aside = shellStore.getState().splitGroup(ROOT_GROUP_ID, 'row');

        openTab('beta', aside);
        shellStore.getState().setSection(RESOURCE, 'description');
        shellStore.getState().closeTab(aside, 'beta');

        expect(selectSection(shellStore.getState(), RESOURCE)).toBe('description');
    });
});

describe('the section a strip inside a resource was left on', () => {
    /** A request and its response are one resource with two strips, each on its own section. */
    it('keeps the section of the strip apart from that of the resource', () => {
        const request = renderHook(() => useResourceSection(RESOURCE, 'params'));
        const response = renderHook(() => useResourceSection(RESOURCE, 'body', 'response'));

        act(() => {
            response.result.current[1]('headers');
        });

        expect(response.result.current[0]).toBe('headers');
        expect(request.result.current[0]).toBe('params');
    });

    it('keeps it while the resource is open and forgets it with the last tab', () => {
        openTab('alpha');

        const response = renderHook(() => useResourceSection(RESOURCE, 'body', 'response'));

        act(() => {
            response.result.current[1]('schema');
        });
        act(() => {
            shellStore.getState().openTab(ROOT_GROUP_ID, {
                id: 'beta',
                kind: 'item',
                resource: 'mandor://demo/events/item/otro',
            });
            shellStore.getState().closeTab(ROOT_GROUP_ID, 'beta');
        });

        expect(response.result.current[0]).toBe('schema');

        act(() => {
            shellStore.getState().closeTab(ROOT_GROUP_ID, 'alpha');
        });

        expect(response.result.current[0]).toBe('body');
    });
});
