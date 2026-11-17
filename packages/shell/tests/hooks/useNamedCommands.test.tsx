import { MessagesProvider } from '@mandor/i18n';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { registerCommand } from '../../src/command/command-registry.js';
import { useNamedCommands } from '../../src/hooks/useNamedCommands.js';
import { shellStore } from '../../src/shell-store.js';

const UNDO: (() => void)[] = [];

function wrapperFor(language: 'en' | 'es') {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <MessagesProvider preferences={{ language }}>{children}</MessagesProvider>;
    };
}

function declare(
    id: string,
    title: string,
    titleValues?: Record<string, number>,
    when?: () => boolean,
) {
    UNDO.push(
        registerCommand({
            category: 'commands:categoryTab',
            icon: 'doc',
            id,
            run: () => undefined,
            title,
            titleValues,
            when,
        }),
    );
}

afterEach(() => {
    cleanup();

    for (const each of UNDO.splice(0)) {
        each();
    }
});

function named(language: 'en' | 'es' = 'en') {
    const { result } = renderHook(() => useNamedCommands(), { wrapper: wrapperFor(language) });

    return result.current;
}

describe('the commands of the window, ready to be read', () => {
    it('reads each title in the language of the window', () => {
        declare('named.split', 'commands:splitRight');

        expect(named('en').find((command) => command.id === 'named.split')?.name).toBe(
            'Split group right',
        );
        expect(named('es').find((command) => command.id === 'named.split')?.name).toBe(
            'Dividir el grupo a la derecha',
        );
    });

    it('fills the values into the title of a command that is one shape many times', () => {
        declare('named.focus', 'commands:focusGroup', { index: 3 });

        expect(named().find((command) => command.id === 'named.focus')?.name).toContain('3');
    });

    it('writes the shortcut of a command that has one, and none for one that has not', () => {
        declare('tab.close', 'commands:closeTab');
        declare('named.plain', 'commands:closeTab');

        const commands = named();

        expect(commands.find((command) => command.id === 'tab.close')?.shortcut).toMatch(/W$/u);
        expect(commands.find((command) => command.id === 'named.plain')?.shortcut).toBeUndefined();
    });

    it('lists only what applies and follows the window when that changes', () => {
        declare(
            'named.maybe',
            'commands:closeTab',
            undefined,
            () => shellStore.getState().revealing !== null,
        );

        const { result } = renderHook(() => useNamedCommands(), { wrapper: wrapperFor('en') });

        expect(result.current.some((command) => command.id === 'named.maybe')).toBe(false);

        act(() => {
            shellStore.getState().setRevealing('mandor://a');
        });

        expect(result.current.some((command) => command.id === 'named.maybe')).toBe(true);

        act(() => {
            shellStore.getState().setRevealing(null);
        });
    });
});
