import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment, type Environment, type Variable } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { VariablePopoverBody } from '../src/components/field/VariablePopoverBody.js';
import { windowScope } from '../src/lib/window-scope.js';

const environment = createEnvironment({
    id: 'local',
    name: 'local',
    variables: [
        { name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false },
        { name: 'token', value: '', enabled: true, secret: true },
    ],
});

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

function show(
    name: string,
    shown: Environment | undefined,
    onVariablesChange: (variables: readonly Variable[]) => void,
    workspace: readonly Variable[] = [],
): void {
    render(
        <VariablePopoverBody
            environment={shown}
            name={name}
            onSeeAll={() => undefined}
            onVariablesChange={onVariablesChange}
            scope={windowScope(shown, workspace, [])}
        />,
        { wrapper: Wrapper },
    );
}

describe('the body of the variable popover', () => {
    it('shows a variable only the globals declare, read-only and named by its origin', () => {
        const onVariablesChange = vi.fn();

        show('host', environment, onVariablesChange, [
            { name: 'host', value: '127.0.0.1', enabled: true, secret: false },
        ]);

        expect(screen.getByLabelText('Variable value')).toHaveTextContent('127.0.0.1');
        expect(screen.getByLabelText('Variable value')).toHaveAttribute('aria-disabled', 'true');
        expect(screen.getByText('Defined in the globals')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^Create it in/ })).toBeNull();
    });

    it('names the folder that gives the value and the environment it overrides', () => {
        render(
            <VariablePopoverBody
                environment={environment}
                name="baseUrl"
                onSeeAll={() => undefined}
                onVariablesChange={vi.fn()}
                scope={windowScope(
                    environment,
                    [],
                    [
                        {
                            level: 'folder',
                            place: { kind: 'folder', path: 'pagos' },
                            name: 'Pagos',
                            settings: {
                                variables: [
                                    {
                                        name: 'baseUrl',
                                        value: 'http://pagos/',
                                        enabled: true,
                                        secret: false,
                                    },
                                ],
                            },
                        },
                    ],
                )}
            />,
            { wrapper: Wrapper },
        );

        expect(screen.getByLabelText('Variable value')).toHaveTextContent('http://pagos/');
        expect(screen.getByText('Defined in Pagos')).toBeInTheDocument();
        expect(screen.getByText(`Overrides ${environment.name}`)).toBeInTheDocument();
    });

    it('lets the environment win over the workspace for the same name', () => {
        show('baseUrl', environment, vi.fn(), [
            { name: 'baseUrl', value: 'http://workspace/', enabled: true, secret: false },
        ]);

        expect(screen.getByLabelText('Variable value')).toHaveTextContent('http://localhost:81/');
        expect(screen.queryByText('From the workspace')).toBeNull();
    });

    it('still offers to create a name that neither level declares', () => {
        show('missing', environment, vi.fn(), [
            { name: 'host', value: '127.0.0.1', enabled: true, secret: false },
        ]);

        expect(screen.getByRole('button', { name: 'Create it in local' })).toBeInTheDocument();
    });

    it('names the environment a declared variable comes from', () => {
        show('baseUrl', environment, vi.fn());

        expect(screen.getByText('local')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'See every variable' })).toBeInTheDocument();
    });

    it('offers to create a variable nobody declared, in place', () => {
        const onVariablesChange = vi.fn();

        show('nobody', environment, onVariablesChange);

        expect(screen.getByText('It is not defined in local.')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Create it in local' }));

        expect(onVariablesChange).toHaveBeenCalledWith([
            { name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false },
            { name: 'token', value: '', enabled: true, secret: true },
            { name: 'nobody', value: '', enabled: true, secret: false },
        ]);
    });

    it('says there is nowhere to declare the variable without an environment', () => {
        show('nobody', undefined, vi.fn());

        expect(
            screen.getByText('There is no active environment to declare it in.'),
        ).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Create it/ })).toBeNull();
    });

    it('says a dynamic reference is computed, not declared', () => {
        show('$uuid', environment, vi.fn());

        expect(
            screen.getByText('Mandor computes this value when the message is sent.'),
        ).toBeInTheDocument();
        expect(screen.queryByLabelText('Variable value')).toBeNull();
        expect(screen.queryByRole('button', { name: /Create it/ })).toBeNull();
    });
});
