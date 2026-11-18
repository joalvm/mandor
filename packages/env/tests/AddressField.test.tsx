import { shellStore, TabProvider } from '@mandor/shell';
import { AddressBar, caretOffsetIn } from '@mandor/ui';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { AddressField } from '../src/index.js';
import { ENVIRONMENT, Wrapper } from './support/variable-field.js';

afterEach(() => {
    cleanup();
    shellStore.getState().reset();
});

/** The address of the tab `tab-1`, drawn as its body would draw it. */
function drawInTab(value: string): HTMLElement {
    render(
        <TabProvider value={{ resource: 'mandor://local/local/loose/a1', tabId: 'tab-1' }}>
            <AddressField
                environment={ENVIRONMENT}
                label="URL"
                onChange={() => undefined}
                onVariablesChange={() => undefined}
                value={value}
            />
        </TabProvider>,
        { wrapper: Wrapper },
    );

    return screen.getByRole('textbox', { name: 'URL' });
}

describe('the address of an address bar (AddressField)', () => {
    it('speaks variables with no box of its own, stretched over the room left', () => {
        render(
            <AddressBar>
                <AddressField
                    environment={ENVIRONMENT}
                    label="URL"
                    onChange={() => undefined}
                    onVariablesChange={() => undefined}
                    value="{{baseUrl}}/ws"
                />
            </AddressBar>,
            { wrapper: Wrapper },
        );

        const textbox = screen.getByRole('textbox', { name: 'URL' });
        const token = textbox.querySelector<HTMLElement>('[data-part="variable-token"]');

        expect(token?.dataset['tone']).toBe('resolved');
        expect(textbox.closest('[data-focus-frame]')).toHaveAttribute('data-part', 'address-bar');
        expect(textbox.closest('.flex-1')).not.toBeNull();
    });

    it('takes the focus, caret at its end, in a tab that was just opened', () => {
        shellStore.setState({ openedTabId: 'tab-1' });

        const textbox = drawInTab('http://api.test');

        expect(textbox).toHaveFocus();
        expect(caretOffsetIn(textbox)).toBe('http://api.test'.length);
        expect(shellStore.getState().openedTabId).toBeNull();
    });

    it('leaves the focus alone in a tab that was only brought to the front', () => {
        shellStore.setState({ openedTabId: 'tab-2' });

        expect(drawInTab('http://api.test')).not.toHaveFocus();
        expect(shellStore.getState().openedTabId).toBe('tab-2');
    });
});
