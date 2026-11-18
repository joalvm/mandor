import { MessagesProvider } from '@mandor/i18n';
import type { Environment } from '@mandor/schema';
import { placeCaretAt, TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState, type ReactNode } from 'react';

import { VariableInput } from '../../src/components/field/VariableInput.js';

export const ENVIRONMENT: Environment = {
    id: 'local',
    name: 'local',
    variables: [
        { name: 'baseUrl', value: 'http://localhost:81/', enabled: true, secret: false },
        { name: 'deviceType', value: '2', enabled: true, secret: false },
    ],
};

export function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

/** A variable field that holds its own value, the way an owner would. */
export function Field({
    environment = ENVIRONMENT,
    initial,
}: {
    environment?: Environment | undefined;
    initial: string;
}) {
    const [value, setValue] = useState(initial);

    return (
        <VariableInput
            environment={environment}
            label="URL"
            onChange={setValue}
            onVariablesChange={() => undefined}
            value={value}
        />
    );
}

export function show(initial: string, environment?: Environment): HTMLElement {
    render(<Field environment={environment} initial={initial} />, { wrapper: Wrapper });

    return screen.getByRole('textbox', { name: 'URL' });
}

/** An edit as the field receives one: new text under the focus, the caret where it stopped. */
export function write(textbox: HTMLElement, text: string, caret = text.length): void {
    fireEvent.focus(textbox);
    textbox.textContent = text;
    placeCaretAt(textbox, caret);
    fireEvent.input(textbox);
}

export function tokenOf(textbox: HTMLElement, name: string): HTMLElement {
    const token = textbox.querySelector<HTMLElement>(`[data-variable="${name}"]`);

    if (token === null) {
        throw new Error(`the token ${name} is not painted`);
    }

    return token;
}
