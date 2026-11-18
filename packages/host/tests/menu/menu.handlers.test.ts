import { CHANNELS, type Empty, type Result } from '@mandor/ipc';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createAppMenuHolder, type AppMenuHolder } from '../../src/menu/app-menu-holder.js';
import { registerMenuHandlers } from '../../src/menu/menu.handlers.js';
import { spyIpc, type IpcSpy } from '../../src/testing/handler-harness.js';

let ipc: IpcSpy;
let holder: AppMenuHolder;
let dispose: () => void;

function spyHolder(): AppMenuHolder {
    return { ...holder, speak: vi.fn(holder.speak) };
}

function call(payload: unknown) {
    return ipc.call(CHANNELS.menuLanguage, payload) as Promise<Result<Empty>>;
}

beforeEach(() => {
    ipc = spyIpc();
    holder = createAppMenuHolder({
        build: (language) => [{ label: `menu-${language}` }],
        install: () => ({ popup: vi.fn() }),
        kind: 'async',
    });
    holder = spyHolder();
    dispose = registerMenuHandlers(ipc, { holder });
});

afterEach(() => {
    dispose();
});

describe('the menu language handler', () => {
    it('rebuilds the menu in the language the renderer speaks', async () => {
        const answer = await call({ language: 'es' });

        expect(holder.speak).toHaveBeenCalledOnce();
        expect(holder.speak).toHaveBeenCalledWith('es');
        expect(answer.ok).toBe(true);
    });

    it('refuses a payload that does not name a language, and touches nothing', async () => {
        const answer = await call({ language: 'fr' });

        expect(holder.speak).not.toHaveBeenCalled();
        expect(answer.ok).toBe(false);
    });
});
