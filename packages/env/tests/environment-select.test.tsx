import { MessagesProvider } from '@mandor/i18n';
import { createEnvironment } from '@mandor/schema';
import { TooltipProvider } from '@mandor/ui';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EnvironmentSelect } from '../src/index.js';

const local = createEnvironment({ id: 'local', name: 'Local' });
const staging = createEnvironment({ id: 'staging', name: 'Staging' });

function Wrapper({ children }: { children: ReactNode }) {
    return (
        <MessagesProvider preferences={{ language: 'en' }}>
            <TooltipProvider>{children}</TooltipProvider>
        </MessagesProvider>
    );
}

describe('the environment select of an address bar, and the EnvironmentChoices it lists', () => {
    it('names the environment it was handed and writes the one chosen', async () => {
        const onChange = vi.fn();

        render(
            <EnvironmentSelect onChange={onChange} options={[local, staging]} value={local.id} />,
            {
                wrapper: Wrapper,
            },
        );
        fireEvent.pointerDown(screen.getByRole('button', { name: /Local/u }));
        fireEvent.click(await screen.findByRole('menuitem', { name: 'Staging' }));

        expect(onChange).toHaveBeenCalledWith(staging.id);
    });

    /** Creating and managing live beside the origin; the bar only chooses. */
    it('offers only the environments, with no door to create or manage them', async () => {
        render(<EnvironmentSelect onChange={() => undefined} options={[local]} value={null} />, {
            wrapper: Wrapper,
        });
        fireEvent.pointerDown(screen.getByRole('button', { name: /No environment/u }));
        await screen.findByRole('menuitem', { name: 'Local' });

        expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    });

    it('stands disabled with nothing to choose and says where environments come from', async () => {
        render(<EnvironmentSelect onChange={() => undefined} options={[]} value={null} />, {
            wrapper: Wrapper,
        });

        const trigger = screen.getByRole('button', { name: /No environment/u });

        fireEvent.focus(trigger.closest('[data-part="disabled-control"]') ?? trigger);

        expect(trigger).toBeDisabled();
        expect(await screen.findByRole('tooltip')).toHaveTextContent('Manage environments');
    });

    it('says the reason it was handed when the owner disables it', async () => {
        render(
            <EnvironmentSelect
                disabled
                disabledReason="Nothing on screen chooses."
                onChange={() => undefined}
                options={[local]}
                value={null}
            />,
            { wrapper: Wrapper },
        );

        const trigger = screen.getByRole('button', { name: /No environment/u });

        fireEvent.focus(trigger.closest('[data-part="disabled-control"]') ?? trigger);

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Nothing on screen chooses.');
    });
});
