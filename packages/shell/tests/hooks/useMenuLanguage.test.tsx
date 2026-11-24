import { cleanup, render } from '@testing-library/react';
import { windowBridge } from '@mandor/ipc/testing';
import { MessagesProvider } from '@mandor/i18n';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMenuLanguage } from '../../src/hooks/useMenuLanguage.js';

function mount(language: string) {
    return render(
        <MessagesProvider preferences={{ language }}>
            <Harness />
        </MessagesProvider>,
    );
}

function Harness() {
    useMenuLanguage();

    return <span />;
}

afterEach(() => {
    // The window goes first: resetting a store under a mounted tree is an update outside act.
    cleanup();

    vi.restoreAllMocks();
});

describe('useMenuLanguage', () => {
    it('tells main which language the window speaks, as soon as it mounts', () => {
        const speak = vi.spyOn(windowBridge().menu, 'speak').mockResolvedValue({
            ok: true,
            value: {},
        });

        mount('es');

        expect(speak).toHaveBeenCalledOnce();
        expect(speak).toHaveBeenCalledWith({ language: 'es' });
    });

    it('says it again only when the language changes', () => {
        const speak = vi.spyOn(windowBridge().menu, 'speak').mockResolvedValue({
            ok: true,
            value: {},
        });

        const view = mount('es');

        view.rerender(
            <MessagesProvider preferences={{ language: 'es' }}>
                <Harness />
            </MessagesProvider>,
        );

        expect(speak).toHaveBeenCalledOnce();

        view.rerender(
            <MessagesProvider preferences={{ language: 'en' }}>
                <Harness />
            </MessagesProvider>,
        );

        expect(speak).toHaveBeenCalledTimes(2);
        expect(speak).toHaveBeenLastCalledWith({ language: 'en' });
    });
});
