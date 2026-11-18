import { MessagesProvider } from '@mandor/i18n';
import { ROOT_GROUP_ID } from '@mandor/ipc';
import { TooltipProvider } from '@mandor/ui';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { EmptyGroup, GroupGrid, shellStore, type Tab } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';

const UNREGISTER: (() => void)[] = [];

const TAB: Tab = { id: 'one', kind: 'doc', resource: 'mandor://demo/payments/doc/one.md' };

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

afterEach(() => {
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }
});

describe('the groups of the grid that have no tab', () => {
    function declare(): void {
        shellStore.getState().reset();
        UNREGISTER.push(
            declareTabKindSpec({
                id: 'doc',
                closable: true,
                icon: 'file',
                body: <p>Contenido</p>,
                title: () => 'one.md',
            }),
        );
    }

    it('says what the window declared for a group with nothing in it', () => {
        declare();
        render(
            <>
                <EmptyGroup>
                    <p>Nada abierto</p>
                </EmptyGroup>
                <GroupGrid />
            </>,
            { wrapper: Wrapper },
        );

        expect(screen.getByText('Nada abierto')).toBeVisible();
    });

    it('stops saying it once a tab opens in the group, and says it again when it closes', () => {
        declare();
        render(
            <>
                <EmptyGroup>
                    <p>Nada abierto</p>
                </EmptyGroup>
                <GroupGrid />
            </>,
            { wrapper: Wrapper },
        );

        act(() => {
            shellStore.getState().openTab(ROOT_GROUP_ID, TAB);
        });

        expect(screen.queryByText('Nada abierto')).toBeNull();

        act(() => {
            shellStore.getState().closeTab(ROOT_GROUP_ID, TAB.id);
        });

        expect(screen.getByText('Nada abierto')).toBeVisible();
    });
});
