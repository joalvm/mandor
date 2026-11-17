import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MessagesProvider } from '@mandor/i18n';
import { TooltipProvider } from '@mandor/ui';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { shellStore } from '../../../src/index.js';
import { declareTabKindSpec } from '../../../src/testing/tab-kind.js';
import { TabOf } from '../../../src/testing/tab-strip.js';

const UNREGISTER: (() => void)[] = [];

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'es' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    for (const unregister of UNREGISTER.splice(0)) {
        unregister();
    }

    shellStore.getState().reset();
});

describe('the name of a tab when pointed at', () => {
    it('says what holds the thing by name, to tell apart two tabs of one name', async () => {
        UNREGISTER.push(
            declareTabKindSpec({
                closable: true,
                icon: 'doc',
                id: 'nested',
                title: () => 'Notas',
                trail: () => ['Guías', 'Instalación'],
            }),
        );
        render(
            <TabOf
                tab={{
                    id: 'nested',
                    kind: 'nested',
                    resource: 'mandor://demo/payments/doc/9k2m4x7q1c3d',
                }}
            />,
            { wrapper: Wrapper },
        );

        fireEvent.focus(screen.getByText('Notas'));

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Notas — Guías / Instalación');
    });

    it('says only the name when nothing holds the thing, and never the resource', async () => {
        UNREGISTER.push(
            declareTabKindSpec({
                closable: true,
                icon: 'doc',
                id: 'alone',
                title: () => 'Notas',
            }),
        );
        render(
            <TabOf
                tab={{
                    id: 'alone',
                    kind: 'alone',
                    resource: 'mandor://demo/payments/doc/9k2m4x7q1c3d',
                }}
            />,
            { wrapper: Wrapper },
        );

        fireEvent.focus(screen.getByText('Notas'));

        const tip = await screen.findByRole('tooltip');

        expect(tip).toHaveTextContent(/^Notas$/u);
        expect(tip).not.toHaveTextContent('9k2m4x7q1c3d');
    });
});
