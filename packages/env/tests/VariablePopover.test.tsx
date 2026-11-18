import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { VariablePopover } from '../src/components/field/VariablePopover.js';
import type { HoverGrace } from '../src/hooks/useHoverGrace.js';
import { windowScope } from '../src/lib/window-scope.js';

const environment = createEnvironment({
    id: 'local',
    name: 'local',
    variables: [{ name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false }],
});

/** A hover on the named token that does nothing on its own, but what a test hands it. */
function hoverOn(
    name: string,
    anchor: HoverGrace['anchor'],
    overrides: Partial<HoverGrace> = {},
): HoverGrace {
    return {
        anchor,
        cancel: () => undefined,
        close: () => undefined,
        hold: () => undefined,
        schedule: () => undefined,
        token: { name, rect: new DOMRect() },
        ...overrides,
    };
}

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

describe('the popover of one variable', () => {
    it('draws nothing while the pointer is on no token', () => {
        const anchor = { current: { getBoundingClientRect: () => new DOMRect() } };

        render(
            <Wrapper>
                <VariablePopover
                    environment={environment}
                    hover={{ ...hoverOn('baseUrl', anchor), token: null }}
                    onVariablesChange={() => undefined}
                    scope={windowScope(undefined, [], [])}
                />
            </Wrapper>,
        );

        expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('hangs open from the anchor it was given, named after the token', () => {
        const anchor = { current: { getBoundingClientRect: () => new DOMRect(4, 8, 60, 16) } };

        render(
            <Wrapper>
                <VariablePopover
                    environment={environment}
                    hover={hoverOn('baseUrl', anchor)}
                    onVariablesChange={() => undefined}
                    scope={windowScope(undefined, [], [])}
                />
            </Wrapper>,
        );

        expect(screen.getByRole('dialog', { name: '{{baseUrl}}' })).toBeInTheDocument();
        expect(screen.getByLabelText('Variable value')).toBeInTheDocument();
    });

    it('hands the create of a missing variable to its owner', () => {
        const onVariablesChange = vi.fn();
        const anchor = { current: { getBoundingClientRect: () => new DOMRect() } };

        render(
            <Wrapper>
                <VariablePopover
                    environment={environment}
                    hover={hoverOn('nobody', anchor)}
                    onVariablesChange={onVariablesChange}
                    scope={windowScope(undefined, [], [])}
                />
            </Wrapper>,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Create it in local' }));

        expect(onVariablesChange).toHaveBeenCalledWith([
            { name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false },
            { name: 'nobody', value: '', enabled: true, secret: false },
        ]);
    });

    /** Typing in the panel is not a visit that ends when the pointer goes back to the keys. */
    it('asks to be held while the focus is inside, and lets go when it leaves', () => {
        const onHold = vi.fn();
        const onScheduleClose = vi.fn();
        const anchor = { current: { getBoundingClientRect: () => new DOMRect() } };

        render(
            <Wrapper>
                <VariablePopover
                    environment={environment}
                    hover={hoverOn('baseUrl', anchor, { hold: onHold, schedule: onScheduleClose })}
                    onVariablesChange={() => undefined}
                    scope={windowScope(undefined, [], [])}
                />
            </Wrapper>,
        );

        const value = screen.getByLabelText('Variable value');

        fireEvent.focus(value);

        expect(onHold).toHaveBeenLastCalledWith(true);
        expect(onScheduleClose).not.toHaveBeenCalled();

        fireEvent.blur(value);

        expect(onHold).toHaveBeenLastCalledWith(false);
        expect(onScheduleClose).toHaveBeenCalledTimes(1);
    });

    it('keeps holding while the focus only moves between the controls of the panel', () => {
        const onHold = vi.fn();
        const anchor = { current: { getBoundingClientRect: () => new DOMRect() } };

        render(
            <Wrapper>
                <VariablePopover
                    environment={environment}
                    hover={hoverOn('baseUrl', anchor, { hold: onHold })}
                    onVariablesChange={() => undefined}
                    scope={windowScope(undefined, [], [])}
                />
            </Wrapper>,
        );

        fireEvent.focus(screen.getByLabelText('Variable value'));
        fireEvent.blur(screen.getByLabelText('Variable value'), {
            relatedTarget: screen.getByRole('button', { name: 'See every variable' }),
        });

        expect(onHold).not.toHaveBeenCalledWith(false);
    });
});
