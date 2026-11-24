import { MessagesProvider } from '@mandor/i18n';
import { success, type LogWriteRequest } from '@mandor/ipc';
import { windowBridge } from '@mandor/ipc/testing';
import { byPart } from '@mandor/ui/testing';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FaultBoundary } from '../../../src/components/fault/FaultBoundary.js';
import { rootErrorOptions } from '../../../src/fault/root-error-options.js';

let written: LogWriteRequest[];

/** A tab that cannot be drawn until somebody mends it. */
const state = { broken: true };

function Fragile() {
    if (state.broken) {
        throw new Error('no se pudo pintar');
    }

    return <p>pintado</p>;
}

/** The root writes what a boundary caught; RTL takes that door and refuses the uncaught one. */
function view(node: ReactNode) {
    const { onCaughtError } = rootErrorOptions();

    return render(<MessagesProvider preferences={{ language: 'es' }}>{node}</MessagesProvider>, {
        onCaughtError,
    });
}

beforeEach(() => {
    state.broken = true;
    written = [];
    windowBridge().log.write = (input) => {
        written.push(input);

        return Promise.resolve(success({}));
    };
});

afterEach(() => {
    cleanup();
});

describe('a tab that fails to draw', () => {
    it('is left as a state of failure while the tab beside it stays usable', () => {
        view(
            <>
                <FaultBoundary scope="tab">
                    <Fragile />
                </FaultBoundary>
                <FaultBoundary scope="tab">
                    <p>intacta</p>
                </FaultBoundary>
            </>,
        );

        expect(screen.getByRole('heading', { name: 'Esta pestaña falló' })).toBeTruthy();
        expect(screen.getByText('intacta')).toBeTruthy();
        expect(byPart('fault-boundary')).toBeTruthy();
    });

    it('draws it again from nothing when told to try again', () => {
        view(
            <FaultBoundary scope="tab">
                <Fragile />
            </FaultBoundary>,
        );
        state.broken = false;
        fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

        expect(screen.getByText('pintado')).toBeTruthy();
    });

    it('writes the fault once, and never shows its stack', () => {
        view(
            <FaultBoundary scope="tab">
                <Fragile />
            </FaultBoundary>,
        );

        expect(written.map((line) => [line.source, line.message])).toEqual([
            ['react-caught', 'no se pudo pintar'],
        ]);
        expect(document.body.textContent).not.toContain('at Fragile');
        expect(document.body.textContent).not.toContain('no se pudo pintar');
    });

    it('closes the tab when it is the way out', () => {
        const onClose = vi.fn();

        view(
            <FaultBoundary onClose={onClose} scope="tab">
                <Fragile />
            </FaultBoundary>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Cerrar pestaña' }));

        expect(onClose).toHaveBeenCalledOnce();
    });

    it('draws it again by itself when what it shows changes', () => {
        function Tabs() {
            const [resource, setResource] = useState('a');

            return (
                <>
                    <button
                        onClick={() => {
                            state.broken = false;
                            setResource('b');
                        }}
                        type="button"
                    >
                        otra
                    </button>
                    <FaultBoundary resetKeys={[resource]} scope="tab">
                        <Fragile />
                    </FaultBoundary>
                </>
            );
        }

        view(<Tabs />);
        fireEvent.click(screen.getByRole('button', { name: 'otra' }));

        expect(screen.getByText('pintado')).toBeTruthy();
    });
});

describe('a section or a window that fails to draw', () => {
    it('offers only to try again in a section, which has no tab to close', () => {
        view(
            <FaultBoundary onClose={vi.fn()} scope="section">
                <Fragile />
            </FaultBoundary>,
        );

        expect(screen.getByRole('heading', { name: 'Esta sección falló' })).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'Cerrar pestaña' })).toBeNull();
        expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    });

    it('offers to reload the window, and reloads it', () => {
        const reload = vi.fn();

        vi.stubGlobal('location', { reload });
        view(
            <FaultBoundary scope="window">
                <Fragile />
            </FaultBoundary>,
        );
        fireEvent.click(screen.getByRole('button', { name: 'Recargar' }));
        vi.unstubAllGlobals();

        expect(screen.getByRole('heading', { name: 'Algo falló en la ventana' })).toBeTruthy();
        expect(reload).toHaveBeenCalledOnce();
    });
});
