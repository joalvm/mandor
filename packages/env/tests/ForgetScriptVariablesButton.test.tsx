import { MessagesProvider } from '@mandor/i18n';
import { failure, success } from '@mandor/ipc';
import { bridge } from '@mandor/shell';
import { ToastProvider, TooltipProvider, type ToastRequest } from '@mandor/ui';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ForgetScriptVariablesButton } from '../src/components/commands/ForgetScriptVariablesButton.js';
import { envStore } from '../src/env-store.js';

const SET = [{ name: 'token', preview: 'abc' }];

function shown(onNotify: (request: ToastRequest) => void = vi.fn()) {
    render(
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>
                <ToastProvider
                    messages={{ close: 'Close', more: (count) => String(count) }}
                    onNotify={onNotify}
                >
                    <ForgetScriptVariablesButton workspaceId="pagos" />
                </ToastProvider>
            </TooltipProvider>
        </MessagesProvider>,
    );
}

async function press(): Promise<void> {
    await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Forget what scripts set' }));
        await Promise.resolve();
    });
}

describe('the button that forgets what scripts set', () => {
    it('forgets them in main, then in the window, for the workspace it names', async () => {
        const clear = vi.spyOn(bridge.scripts, 'clearVariables').mockResolvedValue(success({}));

        envStore.getState().showScriptVariables('pagos', 'prod', SET);
        shown();
        await press();

        expect(clear).toHaveBeenCalledWith('pagos');
        expect(envStore.getState().scriptVariables).toEqual({});
    });

    it('tells why main refused, and keeps showing what main still holds', async () => {
        vi.spyOn(bridge.scripts, 'clearVariables').mockResolvedValue(failure('not-found', 'none'));
        const onNotify = vi.fn();

        envStore.getState().showScriptVariables('pagos', 'prod', SET);
        shown(onNotify);
        await press();

        expect(onNotify).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'That is not there anymore, so nothing was written.',
            }),
        );
        expect(envStore.getState().scriptVariables).toEqual({ pagos: { prod: SET } });
    });
});
