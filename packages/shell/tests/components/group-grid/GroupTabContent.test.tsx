import { MessagesProvider } from '@mandor/i18n';
import { success } from '@mandor/ipc';
import { windowBridge } from '@mandor/ipc/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useContext, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GroupTabContent } from '../../../src/components/group-grid/GroupTabContent.js';
import { rootErrorOptions } from '../../../src/fault/root-error-options.js';
import { GroupGridContext } from '../../../src/grid/group-grid-scope.js';
import { TabProvider } from '../../../src/tab/tab-context.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';

const state = { broken: false };

let undo: (() => void)[] = [];

/** What a kind draws: the tab it was told it belongs to, read the way every part reads it. */
function Body() {
    const tab = useContext(TabProvider);

    if (state.broken) {
        throw new Error('cannot draw');
    }

    return <p>{`${tab?.tabId ?? '?'} shows ${tab?.resource ?? '?'}`}</p>;
}

function contentFor(resource: string, kind = 'sample', onCloseTab = vi.fn()): ReactNode {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <GroupGridContext value={{ onCloseTab, resources: {} }}>
                <GroupTabContent
                    api={{ group: { id: 'group-1' }, id: 'tab-1' }}
                    params={{ kind, resource }}
                />
            </GroupGridContext>
        </MessagesProvider>
    );
}

function view(node: ReactNode) {
    return render(node, { onCaughtError: rootErrorOptions().onCaughtError });
}

beforeEach(() => {
    state.broken = false;
    windowBridge().log.write = () => Promise.resolve(success({}));
    undo = [
        declareTabKindSpec({
            body: <Body />,
            closable: true,
            icon: 'doc',
            id: 'sample',
            title: (resource) => resource,
        }),
    ];
});

afterEach(() => {
    cleanup();

    for (const each of undo) {
        each();
    }
});

describe('what a group shows for its tab in front', () => {
    it('draws the body of the kind inside the tab it belongs to', () => {
        view(contentFor('mandor://a'));

        expect(screen.getByText('tab-1 shows mandor://a')).toBeTruthy();
    });

    it('draws nothing for a kind nobody declared', () => {
        view(contentFor('mandor://a', 'unknown'));

        expect(screen.queryByText(/shows/)).toBeNull();
        expect(screen.queryByRole('heading')).toBeNull();
    });

    it('leaves a body that throws as a state of failure with a way to close the tab', () => {
        const onCloseTab = vi.fn();

        state.broken = true;
        view(contentFor('mandor://a', 'sample', onCloseTab));

        expect(screen.getByRole('heading', { name: 'This tab failed' })).toBeTruthy();

        fireEvent.click(screen.getByRole('button', { name: 'Close tab' }));

        expect(onCloseTab).toHaveBeenCalledWith('group-1', 'tab-1');
    });

    it('draws again when the resource it shows changes', () => {
        state.broken = true;

        const { rerender } = view(contentFor('mandor://a'));

        expect(screen.getByRole('heading', { name: 'This tab failed' })).toBeTruthy();

        state.broken = false;
        rerender(contentFor('mandor://b'));

        expect(screen.getByText('tab-1 shows mandor://b')).toBeTruthy();
    });
});
