import { MessagesProvider } from '@mandor/i18n';
import { failure, success } from '@mandor/ipc';
import { availableCommands, bridge, shellStore, type Command } from '@mandor/shell';
import { ToastProvider } from '@mandor/ui';
import { act, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { envStore } from '../src/env-store.js';
import { ScriptVariableCommands } from '../src/components/commands/ScriptVariableCommands.js';
import { registerScriptVariableCommands } from '../src/register-script-variable-commands.js';

const SET = [{ name: 'token', preview: 'abc' }];

function Providers({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <ToastProvider messages={{ close: 'Close', more: (count) => String(count) }}>
                {children}
            </ToastProvider>
        </MessagesProvider>
    );
}

function commandOf(): Command | undefined {
    return availableCommands(shellStore.getState()).find(
        (command) => command.id === 'scripts.clearVariables',
    );
}

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'pagos' });
    envStore.getState().reset();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('the command that forgets what scripts set', () => {
    it('is offered only while a script set something in the workspace in front', () => {
        const stop = registerScriptVariableCommands(() => undefined);

        expect(commandOf()).toBeUndefined();

        envStore.getState().showScriptVariables('pagos', 'prod', SET);

        expect(commandOf()).toBeDefined();

        envStore.getState().showScriptVariables('otro', 'prod', SET);
        envStore.getState().dropScriptVariables('pagos');

        expect(commandOf()).toBeUndefined();
        stop();
    });

    it('asks main to forget them, then forgets every environment of the workspace here', async () => {
        const clear = vi.spyOn(bridge.scripts, 'clearVariables').mockResolvedValue(success({}));
        const stop = registerScriptVariableCommands(() => undefined);

        envStore.getState().showScriptVariables('pagos', 'prod', SET);
        envStore.getState().showScriptVariables('pagos', '', SET);
        envStore.getState().showScriptVariables('otro', 'prod', SET);
        await act(async () => {
            commandOf()?.run(shellStore.getState());
            await Promise.resolve();
        });

        expect(clear).toHaveBeenCalledWith('pagos');
        expect(envStore.getState().scriptVariables).toEqual({ otro: { prod: SET } });
        stop();
    });

    /** What main still holds is still what the next send reads, so the window keeps showing it. */
    it('tells why main refused, and keeps showing what main still holds', async () => {
        vi.spyOn(bridge.scripts, 'clearVariables').mockResolvedValue(failure('not-found', 'none'));
        const onFailure = vi.fn();
        const stop = registerScriptVariableCommands(onFailure);

        envStore.getState().showScriptVariables('pagos', 'prod', SET);
        await act(async () => {
            commandOf()?.run(shellStore.getState());
            await Promise.resolve();
        });

        expect(onFailure).toHaveBeenCalledWith('not-found');
        expect(envStore.getState().scriptVariables).toEqual({ pagos: { prod: SET } });
        stop();
    });

    it('lives while the window that mounts it does', () => {
        const { unmount } = render(<ScriptVariableCommands />, { wrapper: Providers });

        envStore.getState().showScriptVariables('pagos', 'prod', SET);

        expect(commandOf()).toBeDefined();

        unmount();

        expect(commandOf()).toBeUndefined();
    });
});
