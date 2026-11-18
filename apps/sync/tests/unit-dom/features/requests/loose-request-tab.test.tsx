import { leavesOf, ROOT_GROUP_ID } from '@mandor/ipc';
import { createRequestItem } from '@mandor/schema';
import { shellStore, tabKindOf } from '@mandor/shell';
import { translatorIn } from '@mandor/shell/testing/tab-kind';
import { TabStripOf } from '@mandor/shell/testing/tab-strip';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { NewLooseRequestAction } from '../../../../src/renderer/features/requests/components/strip/NewLooseRequestAction.js';
import { LooseRequestTabKind } from '../../../../src/renderer/features/requests/LooseRequestTabKind.js';
import {
    LOOSE_REQUEST_TAB_KIND,
    looseResource,
} from '../../../../src/renderer/features/requests/lib/loose-resource.js';
import { requestsStore } from '../../../../src/renderer/features/requests/requests-store.js';
import { saveToQuestion } from '../../../../src/renderer/features/requests/save-to-question.js';
import { AppProviders } from '../../support/app-providers.js';

const RESOURCE = looseResource('Local', 'local', 'a1b2');

let unregister: () => void = () => undefined;

beforeEach(() => {
    requestsStore.getState().reset();
    saveToQuestion.setState({ asking: null });
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'local' });
    unregister = render(<LooseRequestTabKind />, { wrapper: AppProviders }).unmount;
});

afterEach(() => {
    cleanup();
    unregister();
    requestsStore.getState().reset();
    saveToQuestion.setState({ asking: null });
    shellStore.getState().reset();
});

describe('the tab of a request saved nowhere (loose-request-tab-kind)', () => {
    it('is titled by the name the request wears, and by the word while it has none', () => {
        const kind = tabKindOf(LOOSE_REQUEST_TAB_KIND);

        expect(kind.title(RESOURCE, translatorIn('en'))).toBe('New request');

        requestsStore.getState().setRequest(RESOURCE, createRequestItem({ name: 'Orders' }));

        expect(kind.title(RESOURCE, translatorIn('en'))).toBe('Orders');
    });

    it('asks before closing only once edited, and never comes back once closed', () => {
        const kind = tabKindOf(LOOSE_REQUEST_TAB_KIND);
        const blank = createRequestItem({ name: 'Orders' });

        requestsStore.getState().setRequest(RESOURCE, blank);

        expect(kind.dirty?.('t', RESOURCE)).toBe(false);
        expect(kind.reopenable).toBe(false);

        requestsStore.getState().setPending(RESOURCE, { before: blank, request: blank });

        expect(kind.dirty?.('t', RESOURCE)).toBe(true);
    });

    it('lets the request go with its tab', () => {
        requestsStore.getState().setRequest(RESOURCE, createRequestItem({ name: 'Orders' }));
        tabKindOf(LOOSE_REQUEST_TAB_KIND).release?.('t', RESOURCE);

        expect(requestsStore.getState().requests[RESOURCE]).toBeUndefined();
    });

    it('asks where it goes when it is saved as it closes, and stays loose when kept', async () => {
        let saving: Promise<unknown> | undefined;

        act(() => {
            saving = tabKindOf(LOOSE_REQUEST_TAB_KIND).save?.('t', RESOURCE);
        });

        expect(saveToQuestion.getState().asking).toMatchObject({
            reopen: false,
            resource: RESOURCE,
        });

        act(() => {
            saveToQuestion.getState().answer(false);
        });

        await expect(saving).resolves.toBe('kept');
    });
});

describe('the add of the strip (new-loose-request-action)', () => {
    it('opens a request saved nowhere in the group of its strip', () => {
        render(
            <TabStripOf groupId={ROOT_GROUP_ID}>
                <NewLooseRequestAction />
            </TabStripOf>,
            { wrapper: AppProviders },
        );

        fireEvent.click(screen.getByRole('button', { name: 'New request' }));

        const tabs = leavesOf(shellStore.getState().grid).flatMap((leaf) => leaf.tabs);

        expect(tabs.map((tab) => tab.kind)).toEqual([LOOSE_REQUEST_TAB_KIND]);
    });
});
